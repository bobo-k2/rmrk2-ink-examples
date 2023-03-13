<template>
  <div class="container">
    <div class="image-container">
      <img
        v-for="(part, index) in tokenAssets[0]?.parts"
        class="image"
        :src="part.partUri"
        :key="`part-${index}`"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useNft2 } from "../hooks/useNft2";

export default defineComponent({
  props: {
    tokenId: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const contractAddress = "5Dorf5aEgDE5ifJkW23AixZXU3EXzUEooWCwUkn2Kqfjd6GK";
    const { fetchNft, tokenAssets } = useNft2(contractAddress);
    console.log(props.tokenId);
    fetchNft(props.tokenId);

    return {
      tokenAssets,
    };
  },
});
</script>

<style scoped>
.container {
}

.image-container {
  position: relative;
}

.image {
  position: absolute;
  width: 400px;
}
</style>
