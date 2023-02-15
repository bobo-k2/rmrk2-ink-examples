<script lang="ts">
import { defineComponent } from "vue";
import { useNft } from "../hooks/useNft";

export default defineComponent({
  setup() {
    const { parts } = useNft();

    return {
      parts,
    };
  },
});
</script>

<template>
  <div class="container">
    <div class="image-container">
      <img
        v-for="(part, index) in parts"
        class="image"
        :src="part.metadataUri"
        :key="`part-${index}`"
      />
    </div>
    <div class="parts-container">
      <b>Parts</b>
      <div
        v-for="(part, index) in parts"
        class="part-container"
        :key="`part-${index}`"
      >
        <div>
          <img :src="part.metadataUri" width="200" />
        </div>
        <div>
          <pre>{{ part }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: row;
}

.parts-container {
  position: absolute;
  left: 500px;
  top: 20px;
}

.part-container {
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid black;
}

.image-container {
  position: relative;
}

.image {
  position: absolute;
  left: 0px;
  top: 0px;
  width: 400px;
  z-index: -1;
}
</style>
