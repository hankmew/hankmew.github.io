window.onload = function(){
    var topBtn = document.getElementById('id-backtop');
    var refFixClassName = "box-fix";
    var refFix = document.getElementById('id-fix');
    var refOffsetTop = refFix.offsetTop;
    var clientHeight = document.documentElement.clientHeight; 
    var timer = null;
    var isTop = true;

    // 给obtn注册平滑滚动函数
    topBtn.onclick = function(){
        timer = setInterval(function(){
            var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            var speed = Math.floor(-scrollTop / 6);
            document.documentElement.scrollTop = document.body.scrollTop = scrollTop + speed;
            isTop =true; 
            if(scrollTop == 0){
                clearInterval(timer);
            }
        },30);
    }

    // 定义操作函数
    function stickyAndTop() {
        var scrollTop = document.documentElement.scrollTop || document.body.scrollTop; 

        //返回顶部
        //if(scrollTop >= clientHeight){
        if(scrollTop > 0){
            topBtn.style.display = 'block';
        }else{
            topBtn.style.display = 'none';
        }
        if(!isTop){
            clearInterval(timer);
        }
        isTop = false;

        //固定元素
        if(scrollTop >= refOffsetTop) {
            refFix.classList.add(refFixClassName);
        }else {
            refFix.classList.remove(refFixClassName);
        }
    }
    // 保证网页第一次加载显示正常
    stickyAndTop();
    // 监听视口变化
    window.onresize = function() {
        stickyAndTop();
    }
    // 监听滚动
    window.onscroll = function(){
        stickyAndTop();
    }


    // 小屏菜单栏展开/隐藏切换
    var menuToggle = document.getElementById('id-menu-toggle');
    var menuToggleClassName = "box-menu-toggle-rotate";
    var menu = document.getElementById('id-menu');
    var menuMinHidenClassName = "box-nav-min-hiden";
    function toggle() {
        if (menu.classList.contains(menuMinHidenClassName)) {
            menu.classList.remove(menuMinHidenClassName)
            menuToggle.classList.add(menuToggleClassName);
        }else{
            menu.classList.add(menuMinHidenClassName)
            menuToggle.classList.remove(menuToggleClassName);
        }
    }
    // 监听点击事件
    menuToggle.addEventListener("click", toggle);
}
