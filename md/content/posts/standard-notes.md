---
title: "Standard Notes 个人云笔记"
tags: ["notes"]
date: 2019-10-31T20:33:24+08:00
draft: false
typora-root-url: ../
---

## 背景

作为一名程序员，笔者先后使用过不同的笔记软件，而且经常是几个月就更换一款。更换的原因一般都是在使用过后，逐渐觉得有些功能无法满足我的需求。遂重新寻找更好的替代方案。

在经历过Evernote、Simplenote、Leanote、有道云笔记、Joplin等笔记软件之后，我对笔记软件的需求逐渐清晰。我希望笔记软件对开发友好，必须有Markdown编辑器和代码编辑器，界面简洁美观，跨平台，版本回滚及备份，高效可靠云同步，传输和存储的加密功能。而Standard Notes完全满足笔者上述的需求。

更让笔者惊喜的是，这款笔记本完全满足想折腾不花钱和想花钱不折腾两类人的需求。Standard Notes的服务端和客户端都是开源免费的，但同时又提供收费的云服务。如果觉得文件存在云服务上不放心的话，可以自己搭建服务端。如果觉得使用官方提供的服务器更稳定，也可以选择购买套餐。

## 方案

本着不折腾不舒服的原则（不想多花钱，想用知识省钱），笔者当然选择部署服务端的方案。这种方案优点不需要多花额外的费用，只需要前期花费一定的时间和精力去搭建服务端，且数据是使用自己的服务器进行同步和存储的，心理上有完全把控的感觉。


## 部署服务端

Standard File是Standard Notes的后端服务。首先它是一个官方给出的标准规范，官方网站是[https://standardfile.org/](https://standardfile.org/)。同时官方还给出了一个使用Ruby实现的服务端程序[https://github.com/standardfile/ruby-server](https://github.com/standardfile/ruby-server)。如果想更高级的折腾的话，完全可以使用自己熟悉的语言按照官方的标准规范开发自己的服务端。有人就是用Go语言实现了官方标准规范。源码在这[https://github.com/dvbportal/standardfile](https://github.com/dvbportal/standardfile)。

笔者比较喜欢体积小的程序部署包，而且不想再增加一个数据库的中间件，所以就选择Go语言+SQLite实现的那款，完全能满足我当前阶段的使用。

笔者使用docker + docker-compose部署这款程序，镜像在这[https://hub.docker.com/r/jetlabs/standardfile](https://hub.docker.com/r/jetlabs/standardfile)。

docker-compose.yml配置如下：

```
version: "3"
services:
  standardfile:
    image: jetlabs/standardfile:0.3.2
    container_name: standardfile
    restart: always
    volumes:
      - /mnt/data/standardfile:/stdfile/logs:rw
```

注意volumes一节中/mnt/xxx可以根据实际情况修改成对应的路径。

最后使用`docker-compose up -d standardfile`启动


## 使用HTTPS

基于对传输安全的考虑，笔者决定使用https。但对于使用Nginx手动申请并配置证书的麻烦程度心有余悸。所以转而投入Caddy的怀抱。（Caddy默认https，配置简单，对于个人使用性能完全够用，尝鲜ing）

注意，本节的前提是拥有一个域名，同时设置二级域名并将A记录指向你的服务器

首先使用touch命令创建名为Caddyfile的配置文件，里面增加几行配置：
```
sf.xxx.com {
  proxy / http://standardfile:8888/api
}
```

然后在上一步中同一个docker-compose.yml中新增配置，整体配置如下：

```
version: "3"
services:
  standardfile:
    image: jetlabs/standardfile:0.3.2
    container_name: standardfile
    restart: always
    volumes:
      - /mnt/data/standardfile:/stdfile/logs:rw
  caddy:
    image: abiosoft/caddy:no-stats
    container_name: caddy
    restart: always
    ports:
      - 80:80
      - 443:443
    volumes:
      - /mnt/soft/docker-compose-yml/Caddyfile:/etc/Caddyfile:rw
      - /mnt/data/caddy/caddy:/root/.caddy:rw
      - /mnt/data/html:/srv:rw
```

注意volumes一节中/mnt/xxx可以根据实际情况修改成对应的路径。

最后使用`docker-compose up -d caddy`启动


## 客户端登录

首先下载对应平台的Standard Notes客户端，下载地址[https://standardnotes.org/](https://standardnotes.org/)，下载后安装并打开。


首先要注册用户。点击左下角的Account，在弹出的框中选择Register，输入邮箱、密码、确认密码，然后点击Advanced Options，在展开的Sync Server Domain字段中输入你在上一步中设置的域名如：https://sf.xxx.com

然后要登录。点击左下角的Account，在弹出的框中选择Sign In，输入注册成功的邮箱、密码，然后点击Advanced Options，在展开的Sync Server Domain字段中输入你在上一步中设置的域名如：https://sf.xxx.com

注意，笔记使用你的密码进行加密存储，且退出登录时会将本地数据清除。退出前最好使用其提供的Download Backup工具手动备份一下文件。

## 安装插件

虽然官方提供的插件也是开源的，地址[https://github.com/sn-extensions](https://github.com/sn-extensions)。但官方的安装方式却不是开源的，也需要自行搭建。比如我只使用advanced-markdown-editor和code-editor这两款插件。就可以在提供的releases页面下载打包好的Source Code。

将下载好的插件源码解压到服务器的某两个可读目录下。如/mnt/data/html/advanced-markdown-editor和/mnt/data/html/code-editor。然后修改caddy的配置文件Caddyfile，增加两个配置。

```
sn-ame.xxx.com {
  root /srv/advanced-markdown-editor
}

sn-ce.xxx.com {
  root /srv/code-editor
}

```

注意，需要在域名管理页面创建sn-ame和sn-ce两个子域名，同时设置A记录指向服务器。

使用命令`docker-compose restart caddy`重启caddy。然后使用浏览器访问https://sn-ame.xxx.com，看是否已经可用。

在/mnt/data/html/advanced-markdown-editor目录下使用命令touch创建一个名为install的文本文件，并编辑增加配置：
```
{
  "identifier": "org.youth.advanced-markdown-editor",
  "name": "Advanced Markdown Editor",
  "content_type": "SN|Component",
  "area": "editor-editor",
  "version": "1.3.5",
  "description": "A fully featured Markdown editor that supports live preview, a styling toolbar, and split pane support.",
  "url": "https://sn-ame.xxx.com",
  "download_url": "https://github.com/sn-extensions/advanced-markdown-editor/archive/1.3.5.zip",
  "latest_url": "https://sn-ame.xxx.com/install",
  "marketing_url": "https://standardnotes.org/extensions/advanced-markdown",
  "thumbnail_url": "https://s3.amazonaws.com/standard-notes/screenshots/models/editors/adv-markdown.jpg"
}
```


在/mnt/data/html/code-editor目录下使用命令touch创建一个名为install的文本文件，并编辑增加配置：
```
{
  "identifier": "org.youth.code-editor",
  "name": "Code Editor",
  "content_type": "SN|Component",
  "area": "editor-editor",
  "version": "1.3.2",
  "description": "Syntax highlighting and convenient keyboard shortcuts for over 120 programming languages. Ideal for code snippets and procedures.",
  "url": "https://sn-ce.xxx.com",
  "download_url": "https://github.com/sn-extensions/code-editor/archive/1.3.2.zip",
  "latest_url": "https://sn-ce.xxx.com/install",
  "marketing_url": "https://standardnotes.org/extensions/code-editor",
  "thumbnail_url": "https://s3.amazonaws.com/standard-notes/screenshots/models/editors/code.jpg"
}
```

最后点击Standard Notes下方的Extensions，然后点击Import Extension，输入`https://sn-ce.xxx.com/install`并回车，输入`https://sn-ame.xxx.com/install`并回车。

插件是多平台同步的，注意不要删除服务端已经部署的插件。

