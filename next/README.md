仿照hexo下的next主题编写的hugo主题，定制了一部分东西，基本能用，陆续会调整样式和兼容性



需要在项目的config.toml加入如下配置



```toml
baseURL = "https://xxx.com/"
languageCode = "zh-CN"
defaultContentLanguage = "zh-CN"
enableRobotsTXT = true
enableEmoji = true
hasCJKLanguage = true
summaryLength = 100
paginate =  5
theme = "bitsly-theme-next"
disableKinds = ["RSS", "sitemap"]
[params]
  title = "站点名称"
  subtitle = "站点副标题"
  author = "作者名称"
  description = "作者介绍"
[[menu.main]]
  url = "/"
  name = "Home"
  weight = 1
  pre = "fa-home"
[[menu.main]]
  url = "/about"
  name = "About"
  weight = 2
  pre = "fa-user-md"
[[menu.main]]
  url = "/posts"
  name = "Archives"
  weight = 3
  pre = "fa-archive"
[[menu.main]]
  url = "/tags"
  name = "Tags"
  weight = 4
  pre = "fa-tag"
[[menu.overview]]
  url = "https://github.com/xxx"
  name = "Github"
  weight = 1
  pre = "fa-github"
[[menu.overview]]
  url = "mailto:xxx@xxx.com"
  name = "E-Mail"
  weight = 2
  pre = "fa-envelope"
```

