
<template>
  <div class="temp-body">
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

  export default {
    components: {
      CurrentPage,
      Links,
      Versions,
    },
    name: 'landing-page',
  };
</script>

<style scoped lang="scss">
  img {
    margin-top: -25px;
    width: 450px;
  }

  .temp-body {color: #F0F0F0;}
</style>
