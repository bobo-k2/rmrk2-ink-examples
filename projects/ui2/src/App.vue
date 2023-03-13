<template>
  <div class="container">
    <NftViewer2 :token-id="1" />
    <NftViewer2 :token-id="2" />
    <NftViewer2 :token-id="3" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import NftViewer2 from "./components/NftViewer2.vue";

export default defineComponent({
  name: "App",
  components: {
    NftViewer2,
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.container {
  position: relative;
}
</style>
