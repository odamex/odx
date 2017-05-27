<template>
    <div id="app">
      <div class="menu-bar-left"></div>
      <div class="draggable-container">
        <router-view></router-view>
      </div>
    </div>
</template>

<script>
  import store from 'renderer/vuex/store';
  export default {
    store,
  };
</script>

<style>
  @import url(https://fonts.googleapis.com/css?family=Lato:300);

  * {
  	outline: 0 none !important;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}


  html,
  body { 
    height: 100%; 
    background-color: rgba(50, 50, 50, 1);
    background-position: center;    
  }

  body {
    align-items: stretch;
    display: flex;
    font-family: Lato, Helvetica, sans-serif;
    justify-content: center;
    text-align: center;
    border:3px solid #2a4956;
    overflow:hidden;
    cursor:default;
  }

  #app {
    -webkit-app-region: no-drag;
    display:flex;
    flex-direction: row;
    flex: 1 1 100%;
    height: calc(100vh - 6px);
  }

  .menu-bar-left {
    width: 72px;
    background-color: rgba(30,30,30,1);
    flex: 1 1 72px;
  }

  .draggable-container {
    flex: 0 1 100%;
    display:flex;
    justify-content:center;
    align-items:center;
    -webkit-app-region: drag;
    /*background:
      radial-gradient(
        ellipse at center,
        rgba(100, 100, 100, 1) 0%,
        rgba(40, 40, 40, 1) 100%
      );*/
    background-color: rgba(80, 80, 80, 1);   
    position: relative; 
  }

  a, link, button, textarea, input, .no-drag {
    -webkit-app-region: no-drag !important;
  }

  a, link, button, input[type=submit], input[type=reset] {
    cursor:pointer;
  }

  input, textarea, .selectable {
      -webkit-touch-callout: text !important;
      -webkit-user-select: text !important;
      user-select: text !important;
  }

</style>
