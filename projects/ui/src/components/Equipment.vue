<template>
  <div>
    <div v-for="(p, index) in previews" :key="index">
      {{ p.id }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useNft, AssetPreview } from "../hooks/useNft";

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
  },
  setup(props) {
    const previews = ref<AssetPreview[]>([]);
    const { getChildrenToEquipPreview } = useNft(props.tokenId);

    const getPreviews = async (): Promise<void> => {
      previews.value = await getChildrenToEquipPreview(props.slotId);
    };

    getPreviews();

    return {
      previews,
    };
  },
});
</script>
