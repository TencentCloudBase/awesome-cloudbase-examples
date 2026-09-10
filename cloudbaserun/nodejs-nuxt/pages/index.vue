<template>
  <pre>{{ JSON.stringify(msg, null, 2) }}</pre>
</template>
<script setup>
const msg = { message: 'Hello World from Nuxt.js on CloudBase Run!', timestamp: new Date().toISOString() };
</script>
