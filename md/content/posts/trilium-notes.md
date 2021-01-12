---
title: "Trilium Notes 个人云笔记"
tags: ["notes"]
date: 2021-01-11T20:33:24+08:00
draft: false
typora-root-url: ../
---

## 背景

作为一名程序员，笔者先后使用过不同的笔记软件，而且经常是几个月就更换一款。更换的原因一般都是在使用过后，逐渐觉得有些功能无法满足我的需求。遂重新寻找更好的替代方案。

在经历过Evernote、Simplenote、Leanote、有道云笔记、Joplin、Standard Notes、Notion等笔记软件之后，我对笔记软件的需求逐渐清晰。我希望笔记软件对开发者友好，必须有Markdown编辑器和富文本编辑器，界面简洁美观，跨平台，版本回滚及备份，高效可靠云同步，传输和存储的加密功能。而Trilium Notes完全满足笔者上述的需求。

## 方案

本着不折腾不舒服的原则（不想多花钱，想用知识省钱），只需要前期花费一定的时间和精力去搭建服务端，且数据是使用自己的服务器进行同步和存储的，心理上有完全把控的感觉。


## 部署服务端

Trilium Notes提供了Docker镜像，可直接使用Docker部署在服务端。

笔者使用docker + docker-compose部署这款程序，镜像在这https://hub.docker.com/r/zadam/trilium 。

docker-compose.yml配置如下：

```
version: "3"
services:
  note:
    container_name: note
    restart: always
    image: zadam/trilium:0.45-latest
    expose:
      - 8080
    environment:
      - TRILIUM_DATA_DIR=/data
    volumes:
      - ./volume/note:/data:rw
```

注意volumes一节中/mnt/xxx可以根据实际情况修改成对应的路径。

最后使用`docker-compose up -d note`启动


## 使用HTTPS

基于对传输安全的考虑，笔者决定使用https。但对于使用Nginx手动申请并配置证书的麻烦程度心有余悸。所以转而投入Caddy2的怀抱。（Caddy2默认https，配置简单，对于个人使用性能完全够用，尝鲜ing）

注意，本节的前提是拥有一个域名，同时设置二级域名并将A记录指向你的服务器

首先创建名为Caddyfile的配置文件，里面增加几行配置：
```
note.xxx.com {
  encode gzip
  reverse_proxy note:8080
}
```

然后在上一步中同一个docker-compose.yml中新增配置，整体配置如下：

```
version: "3"
services:
  note:
    container_name: note
    restart: always
    image: zadam/trilium:0.45-latest
    expose:
      - 8080
    environment:
      - TRILIUM_DATA_DIR=/data
    volumes:
      - ./volume/note:/data:rw
  caddy:
    container_name: caddy
    restart: always
    image: caddy:2.0.0-alpine
    ports:
      - 80:80
      - 443:443
    volumes:
      - ./etc/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./volume/caddy:/data/caddy:rw
```

注意volumes一节中/mnt/xxx可以根据实际情况修改成对应的路径。

最后使用`docker-compose up -d caddy`启动

之后就可以访问https://note.xxx.com看到登录页面了。




## 客户端登录

首先下载对应平台的Standard Notes客户端，下载地址https://github.com/zadam/trilium/releases，下载后安装并打开。

然后通过设置 Menu - Options - Sync下面的Server instance address为上一步中设置的https://note.xxxx.com即可将本地同步到服务端了。

