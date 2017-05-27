<template>
  <div id="app">
    <router-view></router-view>
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
    margin: 0;
    padding: 0;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  	outline: 0 none !important;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}


  html,
  body { height: 100%; }

  body {
    align-items: center;
    background:
      radial-gradient(
        ellipse at center,
        rgba(100, 100, 100, 1) 0%,
        rgba(40, 40, 40, 1) 100%
      );
    background-position: center;
    display: flex;
    font-family: Lato, Helvetica, sans-serif;
    justify-content: center;
    text-align: center;
    height: calc(100vh - 1px);
    border:2px solid #704b1b;
    overflow:hidden;
    cursor:default;
  }

  .draggable-container {
    display:flex;
    justify-content:center;
    align-items:center;
    -webkit-app-region: drag;
    width:calc(100vw - 2px);
    height:calc(100vh - 2px); 
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

  #app {
    -webkit-app-region: no-drag;
  }
</style>
