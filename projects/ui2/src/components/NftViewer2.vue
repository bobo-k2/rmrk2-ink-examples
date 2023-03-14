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
    contractAddress: {
      type: String,
      required: true,
    },
    tokenId: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const { getToken, tokenAssets } = useNft2(props.contractAddress);
    console.log(props.tokenId);
    getToken(props.tokenId);

    return {
      tokenAssets,
    };
  },
});
</script>

<style scoped>
.container {
  border: 1px solid gray  ;
}

.image-container {
  position: relative;
}

.image {
  /* position: absolute; */
  width: 200px;
}
</style>
