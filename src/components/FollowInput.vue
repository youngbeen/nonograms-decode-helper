<script setup>
import { ref, onMounted } from 'vue'
import eventBus from '@/EventBus'

const isShow = ref(false)

const x = ref(0)
const y = ref(0)
const inputValue = ref('')
const tag = ref('')

onMounted(() => {
  eventBus.on('notifyShowFollowInput', params => {
    console.log('show follow input', params)
    x.value = params.x || 0
    y.value = params.y || 0
    inputValue.value = params.value.join(' ')
    tag.value = params.tag
    isShow.value = true
  })
})

const submit = () => {
  eventBus.emit('doneFollowInput', {
    value: inputValue.value,
    tag: tag.value
  })
  isShow.value = false
  inputValue.value = ''
  tag.value = ''
}
</script>

<template>
  <div class="box-follow-input"
    v-show="isShow"
    :style="{ left: x + 'px', top: y + 'px' }">
    <input type="text"
      v-model="inputValue">
    <button
      @click="submit">Ok</button>
  </div>
</template>

<style scoped>
.box-follow-input {
  position: absolute;
  padding: 1rem;
  border: 1px solid rgb(170, 190, 255);
  background: #fff;
}
input {
  margin-right: 1rem;
  min-width: 200px;
  height: 30px;
  line-height: 30px;
}
</style>