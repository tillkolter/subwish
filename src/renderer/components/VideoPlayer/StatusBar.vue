<template>
  <div>
    {{ stage }} {{ percent.toFixed(2) }}%
  </div>
</template>

<script>
  export default {
    name: 'VideoStatusBar',
    computed: {
      percent () {
        return this.$store.state.Video.preProcessingProgress
      },
      stage () {
        return this.$store.state.Video.stage
      }
    }
  }
</script>
