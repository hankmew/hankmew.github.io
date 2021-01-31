---
title: "MVC模式下的业务异常处理"
date: 2021-01-31T20:02:08+08:00
tags: ["java","exception", "result"]
draft: false
typora-root-url: ../
---

## 异常与状态码

所有的编程语言，在设计function的时候，都需要思考一个问题：如何管理function的执行状态和返回数据。所谓执行状态，可以理解成这个function是否处理成功。而返回数据是调用方需要获取到的业务值。一般情况下，只有执行状态为成功时才会有正常的返回数据。

**举个栗子**。A除以B等于C，可以用一个function封装。A和B自然是入参，C是返回结果。伪代码可以这样编写

```
C divide(A, B) {
  return A / B;
}
```
一般情况下这个function的执行状态是正常的，返回数据C可以让调用方直接使用。但我们知道，除法中除数不能为0，如果为0，则结果无意义。因此这个function中必须增加B不能等于0的判断。
```
C divide(A, B) {
  if B == 0 {
    ????
  }
  return A / B;
}
```
如果B等于0，这个function就应该视为执行失败了，返回的数据C对于调用方没有了意义（不应该为任何一个值）。这种情况下，应该使用什么机制去通知调用方呢？


不同编程语言有自己的设计模式。总结起来有两种：**异常**、**状态码**。

使用异常模式，function可以这样处理：

1. 正常则返回数据，否则抛出异常状态。（直接或间接调用方处理捕获异常并处理）

使用状态码模式，function可以这样处理：

1. 返回只有状态没有数据。（执行状态就是返回结果）
2. 返回既表示数据又表示状态。（比如null代表错误状态、非null代表数据值，比如**对象封装了状态和结果**）
3. 返回只代表数据，全局参数代表状态（操作类变量、形参修改实参等）
4. 返回只代表状态，全局参数代表数据（操作类变量、形参修改实参等）
5. 多返回值（go/python等，一个值代表状态、其他值代表数据）
6. 终止程序 （调用方和被调用方都不用关心状态和数据了）



## 业务流程控制

Java使用的是异常机制，而且其实现非常强大。throw和try-catch-finally关键字作为异常传输通道的起点和终点，Throwable类作为异常的类型。这种思想在Java语言下可以应对多变的编码需求。

这里以一个经典的用户注册业务为例，在MVC模式下编写代码。

```java
// dal层向用户表插入一条记录，并返回userId
public Long insertUser(UserInfo userInfo) {
    Long userId = null;
    try {
        userId = userInfoMapper.insert(userInfo);
    }catch (MySQLIntegrityConstraintViolationException e) {
        log.warm("insert user error, duplicate entry {}", userInfo, e);
        throw new BizException(BizState.DB_DUPLICATE);
    }catch (Exception e) {
        log.error("insert user error, {}", userInfo, e);
        throw new BizException(BizState.ERROR);
    }
    if (userId == null || userId <= 0) {
        log.error("insert user error, userId is illegal {}", userInfo);
        throw new BizException(BizState.ERROR);
    }
    return userId;
}

// service层调用dal层向db插入一条记录并获得userId,然后广播用户注册的消息
public Long addUser(UserInfo userInfo) {
    Long userId = null;
    try {
        userId = insertUser(userInfo);
    }catch (BizException e) {
        if (BizState.DB_DUPLICATE.equals(e.getState())) {
            // 抛出用户已存在的异常，让上层转换成给用户看的状态码和提示语
            throw new BizException(BizState.USER_ALREADY_EXISTS);
        }
        throw new BizException(BizState.ERROR);
    }
  
    // 向mq发送广播消息，消费者异步发放新用户奖励。
    mq.send(userId);
  
    // 返回userId
    return userId;
}
```

实际业务场景肯定会比上述代码复杂，这里做了精简以便于展现主要矛盾。我们将关注点放到service层的addUser方法中，业务代码由于使用异常存在如下几个问题：

1. 流程控制的手段不仅有if-else还有try-catch，一个业务由两种方式控制跳转，使得逻辑编写和理解变得复杂且容易出错。
2. “注册的用户已存在”，这种纯业务逻辑，使用异常机制处理究竟合不合理。这里不做展开讨论。
3. 异常允许向上传递多层，但却没有明确在哪层处理的权责划分，会存在每层都try-catch的极端情况。



我们尝试改为状态码模式看看效果。让dal层返回一个Result对象，里面包含了返回数据和调用状态。而service层仅使用if-else对Result对象进行判断。

```java
// dal层向用户表插入一条记录，并返回userId
public Result<Long> insertUser(UserInfo userInfo) {
    Long userId = null;
    try {
        userId = userInfoMapper.insert(userInfo);
    }catch (MySQLIntegrityConstraintViolationException e) {
        log.warm("insert user error, duplicate entry {}", userInfo, e);
        return Result.failure(BizState.DB_DUPLICATE);
    }catch (Exception e) {
        log.error("insert user error, {}", userInfo, e);
        return Result.failure(BizState.ERROR);
    }
    if (userId == null || userId <= 0) {
        log.error("insert user error, userId is illegal {}", userInfo);
        return Result.failure(BizState.ERROR);
    }
    return Result.success(userId);
}

// service层调用dal层向db插入一条记录并获得userId,然后广播用户注册的消息
public Result<Long> addUser(UserInfo userInfo) {
    Result res = insertUser(userInfo);
    if (res.isFailure()) {
        if (res.isFailureEquals(BizState.DB_DUPLICATE)) {
            // 返回用户已经存在的业务状态，让上层转换成给用户看的状态码和提示语
            return Result.failure(BizState.USER_ALREADY_EXISTS);
        }
        return Result.failure(BizState.ERROR);
    }
  
    // 向mq发送广播消息，消费者异步发放新用户奖励。
    mq.send(res.getData)
    
    // 返回userId
    return userId;
}
```

与使用异常模式的代码相比，状态码模式的dal层和service层责任没有变，dal层仍然是向数据库中写入数据，service层作为业务编排串行调用dal层和mq层。而主要的变化点有：

1. 数据库的异常完全在dal层捕获，不上抛到业务层，只将外部错误都转换为会影响内部业务的状态。

2. dal层与service层通过Result对象返回结果。且Result对象中既有数据又有状态。

3. service层只需要使用if-else判断获取到的状态即可。

4. service层先判断异常情况并提前处理。且正常流程都在一个缩进中完成，非正常流程在次级缩进中完成。



**状态码模式让流程控制变得简洁易读，更适合MVC模式下的业务逻辑处理**



## Result的简单实现

这里对Result进行了简单实现，供大家参考。



**Result**

```java
public class Result<T> {
    private final T data;
    private final Status status;

    /* 创建 */
    private Result(T data, Status status) {
        this.data = data;
        this.status = status;
    }
    public static<T> Result<T> success(T data) {
        return new Result<>(data, null);
    }
    public static<T> Result<T> failure(Status status) {
        return new Result<>(null, status);
    }
    public static<T> Result<T> failure() {
        return new Result<>(null, BasicStatus.FAILURE);
    }
  
    /* 状态 */
    public boolean isSuccess() {
        return this.status == null;
    }
    public boolean isFailure() {
        return this.status != null;
    }
    public boolean isFailureEquals(Status status) {
        if (this.status == null) {
            return false;
        }
        return this.status.equals(status);
    }
    public boolean isEmpty() {
        if (this.data == null) {
            return true;
        }else {
            if (this.data instanceof Collection) {
                return ((Collection<?>) this.data).isEmpty();
            }else {
                return false;
            }
        }
    }
    public boolean notEmpty() {
        return !isEmpty();
    }
    /* 获取 */
    public T get() {
        return this.data;
    }
    public T getDefault(T defaultData) {
        return isEmpty() ? defaultData : this.data;
    }

    public interface Status {
      
    }

    public enum BasicStatus implements Result.Status {
        FAILURE, //未知系统异常，出现无法恢复的都使用这个状态即可
        ;
    }
}
```

**业务状态枚举类**

```java
public enum BizStatus implements Result.Status {
    INTERNAL_SERVER_ERROR(-1),
    OK(0),
    PARAM_ERROR(1),
    USER_NOT_EXIST(2),
    ;

    private final Integer code;

    BizStatus(Integer code) {
        this.code = code;
    }

    public Integer getCode() {
        return code;
    }
}
```



## 一些尾巴

如果业务比较复杂，会出现业务层内有多级方法调用的情况，每层都返回Result结果，每层都要对Result结果进行判断。最终的形式可能与判断变量是否等于null相同了（其实更像golang的if err != nil）。但仍然比每层都要try-catch这种极端形式要好的多。

在一些语言纯粹性的狂热信徒眼中，Result模式对异常机制的亵渎，是状态对数据的污染，是开语言发展的倒车。我觉得这种批判大可不必，我始终认为能让程序员更简单的理解和编写代码的模式，才是好模式。

Java是一款优秀的编程语言，它的异常机制非常强大，可以编写出非常好用的依赖包、APP、中间件、Web服务等等。而本文仅对MVC模式下的业务层代码进行讨论，提出了Result模式会更方便开发的思路。欢迎大家提出自己的宝贵意见和建议，我们大家一起讨论一起成长。



