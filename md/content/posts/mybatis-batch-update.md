---
title: "批量执行SQL-以MyBatis为例"
tags: ["mysql", "mybatis"]
date: 2019-04-12T15:18:10+08:00
draft: false
typora-root-url: ../
---
WEB项目的定时任务，经常会用到批量更新的场景。MyBatis框架操作MySQL的技术栈如何批量更新问题，这个问题网络上却没有一个最佳实践。最近遇到了这个问题，下面分享一下实践方案。

## 场景预设

每天凌晨零点之后开始，计算用户收益额度，写入数据库中。数据表`t_financial`简略如下：

    f_id //主键
    f_create_at //创建时间
    f_updated_at //更新时间
    f_version //版本号
    f_state //状态
    f_amount //
    ...

## 第一种方式

使用MyBatis的动态语句，foreach循环将多个update语句拼接在一起。JDBC的连接要设置`allowMultiQueries=true`。
    
    <update id="updateBatch"  parameterType="java.util.List">  
        <foreach collection="list" item="item" index="index" open="" separator=";" close="">
            update t_financial
            <set>
                <if test="updatedAt != null">
                    f_updated_at= #{item.updatedAt},
                </if>
                <if test="version != null">
                    f_version= #{item.version} + 1,
                </if>
                <if test="state != null">
                    f_state= #{item.state},
                </if>
                <if test="amount != null">
                    f_amount= #{item.amount},
                </if>
                    
                    ...
                    
            </set>
            <where>
                <if test="item.id != null">
                    f_id = #{item.id}
                </if>
                <if test="item.version != null">
                    and f_version = #{item.version}
                </if>
            </where>
        </foreach>      
    </update>

拼接完成出来的sql语句如下：

    update t_financial set f_updated_at=?,f_version=?,f_state=?f_amount=? where f_id=? and f_version=?;update t_financial set f_updated_at=?,f_version=?,f_state=?f_amount=? where f_id=? and f_version=?;...


优点：

- 写法简单

缺点：

- 只是减少了网络调用，但MySQL执行时仍然是一条条的提交。性能没有显著提升。（其实这不是批量执行，而只能称之为是遍历执行。）
- 受MySQL的`max_allowed_packet`参数影响（默认1M），如果每次拼接的sql语句超过设置范围，会被MySQL拒绝执行。


## 第二种方法

使用MyBatis的动态语句，foreach循环将多个case when then拼接成一条语句。


    <update id="updateBatch" parameterType="java.util.List">
        update t_financial
        <set>
            <foreach collection="list" item="item" index="index" open="f_updated_at = case f_id" separator=" " close="end,">
                <if test="item.updated != null">
                    when #{item.id} then #{item.amount}
                </if>
            </foreach>
            <foreach collection="list" item="item" index="index" open="f_version = case f_id" separator=" " close="end,">
                <if test="item.version != null">
                    when #{item.id} then #{item.version}+1
                </if>
            </foreach>
            <foreach collection="list" item="item" index="index" open="f_state = case f_id" separator=" " close="end,">
                <if test="item.state != null">
                    when #{item.id} then #{item.state}
                </if>
            </foreach>
            <foreach collection="list" item="item" index="index" open="f_amount = case f_id" separator=" " close="end,">
                <if test="item.amount != null">
                    when #{item.id} then #{item.amount}
                </if>
            </foreach>
            
                ...
                
        </set>
        <where>
            <foreach collection="list" item="item" index="index" open="(" separator=") or (" close=")">
                <trim prefixOverrides="and">
                    <if test="item.id != null">
                        f_id = #{item.id}
                    </if>
                    <if test="item.version != null">
                        and f_version #{item.version}
                    </if>
                </trim>
            </foreach>
        </where>
    </update>

拼接之后的sql语句如下


    update t_financial set 
    f_updated_at = case f_id
        when ? then ?
        when ? then ?
        ...
    end,
    f_version = case f_id
        when ? then ?
        when ? then ?
        ...
    end,
    f_state = case f_id
        when ? then ?
        when ? then ?
        ...
    end,
    f_amount = case f_id
        when ? then ?
        when ? then ?
        ...
    end
    where 
        (f_id = ? and f_version = ?) or
        (f_id = ? and f_version = ?)

优点：

- 性能提升与编写难度比较均衡

缺点：

- 如果每次执行的sql语句大于MySQL设置的最大传送大小，会被MySQL拒绝。
  

## 第三种方法

通过MyBatis使用JDBC的executeBatch()方法。JDBC的连接要设置`rewriteBatchedStatements=true`
    
mapper.xml写法如下：


    <update id="update">  
            update t_financial
            <set>
                <if test="updatedAt != null">
                    f_updated_at= #{item.updatedAt},
                </if>
                <if test="version != null">
                    f_version= #{item.version} + 1,
                </if>
                <if test="state != null">
                    f_state= #{item.state},
                </if>
                <if test="amount != null">
                    f_amount= #{item.amount},
                </if>
                    
                    ...
                        
            </set>
            <where>
                <if test="item.id != null">
                    f_id = #{item.id}
                </if>
                <if test="item.version != null">
                    and f_version = #{item.version}
                </if>
            </where>
    </update>

MyBatis全局可以设置为ExecutorType.REUSE，会重用PreparedStatements而不是每次都新建，从而提升性能。局部临时将session模式设置为ExecutorType.BATCH，调用代码如下：    
    
    @Resource
    private SqlSessionTemplate sqlSessionTemplate;
    
    public void batchUpdate(List<Object> financialList) {
        try (SqlSession sqlSession = sqlSessionTemplate.getSqlSessionFactory().openSession(ExecutorType.BATCH, false)) {
            FinancialMapper mapper = sqlSession.getMapper(FinancialMapper.class);
            for (Financial item: financialList) {
                mapper.update(item);
            }
            sqlSession.commit();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }




优点：

- 使用JDBC原生支持的批量方案，性能有保障

缺点：

- 需要手动封装事务等原本由MyBatis封装处理的问题，手动处理却没有考虑到则容易造成事故。
- 使用ExecutorType.BATCH模式时，insert在事务没有提交前无法获取到自增id。在某些业务下不符合要求。谨慎设置全局BATCH，以免影响其他正常运行的业务。


## 选择思路

- 从性能考虑，不要使用第一种方式。
- 性能和写法平衡上，尽量考虑使用第二种方式，但是要注意每次不要拼接大量数据。
- 如果每次需要拼接大量数据且无特殊业务需求可以考虑第三种。但是要注意做好封装。

## 其他

同时也要打开JDBC的预编译缓存的选项。

    # 开启服务端预编译
    useServerPrepStmts=true
    # 开启预编译缓存
    cachePrepStmts=true
    # 预编译缓存的sql条数，根据业务的sql条数判断，一般设置250即可
    prepStmtCacheSize=250
    # 预编译缓存sql语句长度大小，一般设置4096
    prepStmtCacheSqlLimit=4096