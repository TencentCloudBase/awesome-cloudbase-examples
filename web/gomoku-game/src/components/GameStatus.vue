<template>
  <div class="game-status bg-white shadow rounded-lg p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">游戏状态</h2>
      <div class="text-sm font-medium px-3 py-1 rounded-full" :class="statusClass">
        {{ statusText }}
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="flex flex-col items-center p-3 rounded-lg bg-gray-50">
        <div class="w-8 h-8 rounded-full bg-black mb-2"></div>
        <div class="font-medium">{{ blackPlayerName || '等待加入...' }}</div>
        <div class="text-xs text-gray-500">黑棋</div>
      </div>
      
      <div class="flex flex-col items-center p-3 rounded-lg bg-gray-50">
        <div class="w-8 h-8 rounded-full bg-white border-2 border-gray-300 mb-2"></div>
        <div class="font-medium">{{ whitePlayerName || '等待加入...' }}</div>
        <div class="text-xs text-gray-500">白棋</div>
      </div>
    </div>
    
    <div v-if="gameStatus === 'playing'" class="text-center mb-4">
      <div class="text-sm">当前回合</div>
      <div class="flex justify-center items-center mt-1">
        <div 
          class="w-6 h-6 rounded-full mr-2" 
          :class="currentTurn === 'black' ? 'bg-black' : 'bg-white border border-gray-300'"
        ></div>
        <div class="font-medium">{{ currentTurn === 'black' ? blackPlayerName : whitePlayerName }}</div>
      </div>
    </div>
    
    <div v-if="isGameOver" class="text-center mb-4">
      <div class="text-lg font-bold mb-1" :class="winnerClass">
        {{ gameResultText }}
      </div>
    </div>
    
    <div class="flex justify-between">
      <button 
        v-if="isGameOver && !isSpectator" 
        class="btn btn-primary text-sm"
        @click="$emit('restart')"
      >
        <i class="fas fa-redo mr-1"></i> 再来一局
      </button>
      
      <button 
        class="btn btn-secondary text-sm"
        @click="$emit('exit')"
      >
        <i class="fas fa-sign-out-alt mr-1"></i> 退出游戏
      </button>
      
      <button 
        v-if="roomId" 
        class="btn btn-primary text-sm"
        @click="copyShareLink"
      >
        <i class="fas fa-share-alt mr-1"></i> 分享链接
      </button>
    </div>
    
    <div v-if="copied" class="text-center text-sm text-green-600 mt-2">
      链接已复制到剪贴板
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';
import { GAME_STATUS, PLAYER_ROLES, getGameStatusText } from '@/utils/gameUtils';

const props = defineProps({
  gameStatus: {
    type: String,
    required: true
  },
  currentTurn: {
    type: String,
    default: PLAYER_ROLES.BLACK
  },
  blackPlayer: {
    type: Object,
    default: null
  },
  whitePlayer: {
    type: Object,
    default: null
  },
  roomId: {
    type: String,
    default: null
  },
  isSpectator: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['restart', 'exit']);

const copied = ref(false);

const blackPlayerName = computed(() => props.blackPlayer?.name || '');
const whitePlayerName = computed(() => props.whitePlayer?.name || '');

const statusText = computed(() => getGameStatusText(props.gameStatus));

const statusClass = computed(() => {
  switch (props.gameStatus) {
    case GAME_STATUS.WAITING:
      return 'bg-yellow-100 text-yellow-800';
    case GAME_STATUS.PLAYING:
      return 'bg-green-100 text-green-800';
    case GAME_STATUS.BLACK_WIN:
    case GAME_STATUS.WHITE_WIN:
      return 'bg-blue-100 text-blue-800';
    case GAME_STATUS.DRAW:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
});

const isGameOver = computed(() => [
  GAME_STATUS.BLACK_WIN,
  GAME_STATUS.WHITE_WIN,
  GAME_STATUS.DRAW
].includes(props.gameStatus));

const gameResultText = computed(() => {
  switch (props.gameStatus) {
    case GAME_STATUS.BLACK_WIN:
      return `黑棋 (${blackPlayerName.value}) 获胜!`;
    case GAME_STATUS.WHITE_WIN:
      return `白棋 (${whitePlayerName.value}) 获胜!`;
    case GAME_STATUS.DRAW:
      return '平局!';
    default:
      return '';
  }
});

const winnerClass = computed(() => {
  switch (props.gameStatus) {
    case GAME_STATUS.BLACK_WIN:
      return 'text-gray-900';
    case GAME_STATUS.WHITE_WIN:
      return 'text-gray-700';
    default:
      return 'text-gray-600';
  }
});

function copyShareLink() {
  if (!props.roomId) return;
  
  // 获取当前页面URL的基础部分（包含子路径）
  const baseUrl = window.location.href.split('#')[0];
  const shareLink = `${baseUrl}#/room/${props.roomId}`;
  
  navigator.clipboard.writeText(shareLink).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}
</script> 