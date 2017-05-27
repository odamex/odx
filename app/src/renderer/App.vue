<template>
    <div id="app">
      <div class="menu-bar-left"></div>
      <div class="draggable-container">
        <div class="app-window-controls">
          <a href="#" v-on:click="winMinimize"><i class="fa fa-lg fa-window-minimize"></i></a>
          <a href="#" v-on:click="winRestore" class="visible-maximized-inline"><i class="fa fa-lg fa-window-restore"></i></a>
          <a href="#" v-on:click="winMaximize" class="hidden-maximized"><i class="fa fa-lg fa-window-maximize"></i></a>
          <a href="#"  v-on:click="winToggleFullscreen"><i class="fa fa-lg fa-arrows-alt"></i></a>
          <a href="#" v-on:click="winClose"><i class="fa fa-lg fa-times" style="font-size: 1.7em;"></i></a>
        </div>          
        <router-view></router-view>
      </div>
    </div>
</template>

<script>
  import store from 'renderer/vuex/store';

  /**
    [ML] Currently this causes warnings if the screen is refreshed.
    Screen refreshing should be outright disabled.
  **/

  const w = require('electron').remote.getCurrentWindow();

  w.on('minimize', () => {
    document.querySelector('body').className = 'minimized';
  });
  w.on('maximize', () => {
    document.querySelector('body').className = 'maximized';
  });
  w.on('unmaximize', () => {
    document.querySelector('body').className = '';
  });
  w.on('enter-html-fullscreen', () => {
    document.querySelector('body').className = 'fullscreen';
  });
  w.on('leave-html-fullscreen', () => {
    document.querySelector('body').className = '';
  });

  export default {
    store,
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
      winRestore(e) {
        e.preventDefault();
        w.unmaximize();
      },
      winToggleFullscreen(e) {
        e.preventDefault();
        const flag = !(w.isFullScreen());
        w.setFullScreen(flag);
      },
    },
  };
</script>

<style lang="scss">
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

    [class^=visible-maximized], {
      display: none;
    }

    &.maximized {
      .hidden-maximized {
        display: none !important;
      }

      .visible-maximized {
        display: block;
      }

      .visible-maximized-inline {
        display:inline;
      }

      .visible-maximized-inline-block {
        display:inline-block;
      }
    }
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
