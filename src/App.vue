<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',
}
</script>

<style>
body,
.v-application {
  font-family: 'Google Sans', 'Noto Sans SC', Arial, sans-serif !important;
}
</style>
