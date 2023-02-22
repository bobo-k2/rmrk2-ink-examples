<template>
  <div class="container">
    <div v-for="[k, v] in previews" :key="k.u64">
      <!-- Assuming that asset with index 0 is preview one -->
      <img :src="v[0]?.gatewayUrl" /><br />
      <button @click="equip(slotId, k, previews?.get(k))">Equip</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { Id } from "../../../scripts/typed_contracts/types-returns/rmrk_contract";
import { useNft } from "../hooks/useNft";
import { ExtendedAsset } from "../../../scripts/read_token";

export default defineComponent({
  props: {
    tokenId: {
      type: Number,
      required: true,
    },
    slotId: {
      type: Number,
      required: true,
    },
    getChildren: {
      type: Function,
      required: true,
    },
    equip: {
      type: Function,
      required: true,
    }
  },
  setup(props) {
    const previews = ref<Map<Id, (ExtendedAsset | null)[]>>();

    const getPreviews = async (): Promise<void> => {
      previews.value = await props.getChildren(props.slotId);
    };

    getPreviews();

    return {
      previews,
    };
  },
});
</script>

<style scoped>
img {
  margin: 10px;
  width: 100px;
  border: 1px solid lightgray;
}

button {
  margin: 6px;
  padding: 10px;
}

.container {
  display: flex;
}
</style>
