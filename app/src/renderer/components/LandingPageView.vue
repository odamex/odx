
<template>
  <div class="temp-body">
    <div class="app-window-controls">
      <a href="#" v-on:click="winMinimize"><i class="fa fa-lg fa-window-minimize"></i></a>
      <a href="#" v-on:click="winMaximize"><i class="fa fa-lg fa-window-maximize"></i></a>
      <!--<a href="#"  v-on:click="winGofullscreen"><i class="fa fa-lg fa-arrows-alt"></i></a>-->
      <a href="#" v-on:click="winClose"><i class="fa fa-lg fa-times" style="font-size: 1.7em;"></i></a>
    </div>   
    <img src="./LandingPageView/assets/logo.png" alt="electron-vue">
    <h1>Welcome.</h1>
    <current-page></current-page>
    <versions></versions> 
  </div>
</template>

<script>
  import CurrentPage from './LandingPageView/CurrentPage';
  import Links from './LandingPageView/Links';
  import Versions from './LandingPageView/Versions';

  const w = require('electron').remote.getCurrentWindow();

  export default {
    components: {
      CurrentPage,
      Links,
      Versions,
    },
    name: 'landing-page',
    methods: {
      winMaximize(e) {
        e.preventDefault();
        w.maximize();
      },
      winMinimize(e) {
        e.preventDefault();
        w.minimize();
      },
      winClose(e) {
        e.preventDefault();
        w.close();
      },
      winGoFullscreen(e) {
        e.preventDefault();
        window.alert('fullscreen window');
      },
    },
  };
</script>

<style scoped lang="scss">
  img {
    margin-top: -25px;
    width: 450px;
  }

  .app-window-controls {
    position:absolute;
    top:2rem;
    right:2rem;

    a {
      color: #F0F0F0;
      margin-right: 1em;
      opacity: .6;

      &:last-child {
        margin-right: 0;
      }

      &:hover {
        opacity: 1;
      }
    }
  }

  .temp-body {color: #F0F0F0;}
</style>
