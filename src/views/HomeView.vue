<script setup>
import Playground from '../components/Playground.vue'
</script>

<template>
  <main @click.right.prevent>
    <Playground />
  </main>
</template>

<style scoped>
main {
  position: relative;
}
</style>
