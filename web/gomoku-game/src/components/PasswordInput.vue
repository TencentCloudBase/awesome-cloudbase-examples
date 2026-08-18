<template>
  <div class="password-input">
    <div class="flex flex-col space-y-2 mb-4">
      <label for="password" class="text-sm font-medium text-gray-700">
        {{ label }}
      </label>
      <div class="relative">
        <input
          :id="id"
          :type="showPassword ? 'text' : 'password'"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          class="input w-full pr-10"
          :placeholder="placeholder"
          autocomplete="off"
        />
        <button
          type="button"
          class="absolute inset-y-0 right-0 px-3 flex items-center"
          @click="togglePasswordVisibility"
        >
          <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="text-gray-500"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: '房间密码'
  },
  placeholder: {
    type: String,
    default: '请输入房间密码'
  },
  id: {
    type: String,
    default: 'password'
  }
});

defineEmits(['update:modelValue']);

const showPassword = ref(false);

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}
</script> 