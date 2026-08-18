<template>
  <div class="space-y-4">
    <!-- 广告位：长条形 -->
    <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <span class="text-white font-medium">
            <i class="fas fa-trophy text-yellow-300 mr-2"></i>
            五子棋大师赛
          </span>
          <span class="text-white text-sm">
            <i class="fas fa-users mr-1"></i>
            1000+ 在线
          </span>
          <span class="text-white text-sm">
            <i class="fas fa-star mr-1"></i>
            排位赛季进行中
          </span>
        </div>
        <span class="text-xs bg-white bg-opacity-20 rounded px-2 py-1 text-white">广告</span>
      </div>
    </div>

    <!-- 战况报告：滚动形式 -->
    <div class="battle-report bg-white rounded-lg shadow-md p-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center">
          <i class="fas fa-chess text-blue-500 mr-2"></i>
          实时对战
        </h2>
        <button @click="refreshRooms" class="text-sm text-blue-500 hover:text-blue-700">
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }"></i>
        </button>
      </div>

      <!-- 滚动容器 -->
      <div class="relative h-48 overflow-hidden">
        <transition-group 
          name="slide"
          tag="div"
          class="space-y-3"
          :style="{ transform: `translateY(${-currentIndex * 64}px)` }"
        >
          <div v-for="(room, index) in rooms" :key="room._id"
               class="p-3 rounded-lg border transition-all duration-300"
               :class="getRoomStatusClass(room)">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium flex items-center">
                <i class="fas mr-2" :class="getRoomStatusIcon(room)"></i>
                {{ getRoomStatusText(room) }}
              </span>
              <span class="text-xs text-gray-500">{{ formatTime(room.updateTime) }}</span>
            </div>
            
            <div class="flex items-center justify-between text-sm mt-1">
              <div class="flex items-center space-x-2">
                <span class="font-medium">{{ room.blackPlayer?.name || '等待加入' }}</span>
                <span class="text-gray-500">vs</span>
                <span class="font-medium">{{ room.whitePlayer?.name || '等待加入' }}</span>
              </div>
              
              <button 
                @click="handleRoomAction(room)" 
                class="text-blue-600 hover:text-blue-800 text-xs"
              >
                <i class="fas fa-sign-in-alt mr-1"></i>
                {{ getActionText(room) }}
              </button>
            </div>
          </div>
        </transition-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { GAME_STATUS } from '@/utils/gameUtils';
import { useRouter } from 'vue-router';

const router = useRouter();
const gameStore = useGameStore();
const rooms = ref([]);
const loading = ref(false);
const currentIndex = ref(0);
let refreshInterval;
let scrollInterval;

// 处理房间操作：加入、观战或查看回放
const handleRoomAction = async (room) => {
  try {
    if (room.gameStatus === GAME_STATUS.WAITING) {
      // 需要密码加入，跳转到加入页面
      router.push(`/join/${room._id}`);
    } else if (room.gameStatus === GAME_STATUS.PLAYING) {
      // 观战模式 - 无需密码
      await gameStore.joinRoom(
        room._id, 
        '', // 空密码
        localStorage.getItem('player_name') || '观众' + Math.floor(Math.random() * 1000), 
        null, 
        'spectate' // 观战模式
      );
      router.push(`/room/${room._id}`);
    } else {
      // 回放模式 - 无需密码
      await gameStore.joinRoom(
        room._id, 
        '', // 空密码
        localStorage.getItem('player_name') || '观众' + Math.floor(Math.random() * 1000), 
        null, 
        'replay' // 回放模式
      );
      router.push(`/room/${room._id}`);
    }
  } catch (error) {
    console.error('操作房间失败:', error);
    alert('操作失败: ' + (error.message || '未知错误'));
  }
};

// 获取房间状态样式
const getRoomStatusClass = (room) => {
  if (room.gameStatus === GAME_STATUS.PLAYING) {
    return 'bg-blue-50 border-blue-200';
  } else if ([GAME_STATUS.BLACK_WIN, GAME_STATUS.WHITE_WIN].includes(room.gameStatus)) {
    return 'bg-yellow-50 border-yellow-200';
  } else if (room.gameStatus === GAME_STATUS.DRAW) {
    return 'bg-gray-50 border-gray-200';
  }
  return 'bg-green-50 border-green-200';
};

// 获取房间状态图标
const getRoomStatusIcon = (room) => {
  if (room.gameStatus === GAME_STATUS.PLAYING) {
    return 'fa-chess-board text-blue-500';
  } else if ([GAME_STATUS.BLACK_WIN, GAME_STATUS.WHITE_WIN].includes(room.gameStatus)) {
    return 'fa-trophy text-yellow-500';
  } else if (room.gameStatus === GAME_STATUS.DRAW) {
    return 'fa-handshake text-gray-500';
  }
  return 'fa-door-open text-green-500';
};

// 获取房间状态文本
const getRoomStatusText = (room) => {
  if (room.gameStatus === GAME_STATUS.PLAYING) {
    return '对局进行中';
  } else if (room.gameStatus === GAME_STATUS.BLACK_WIN) {
    return '黑方胜利';
  } else if (room.gameStatus === GAME_STATUS.WHITE_WIN) {
    return '白方胜利';
  } else if (room.gameStatus === GAME_STATUS.DRAW) {
    return '平局';
  }
  return '等待加入';
};

// 获取操作文本
const getActionText = (room) => {
  if (room.gameStatus === GAME_STATUS.WAITING) {
    return '加入对局';
  } else if (room.gameStatus === GAME_STATUS.PLAYING) {
    return '观战';
  }
  return '查看回放';
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // 小于1分钟
    return '刚刚';
  } else if (diff < 3600000) { // 小于1小时
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) { // 小于24小时
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    return date.toLocaleDateString();
  }
};

// 刷新房间列表
const refreshRooms = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    await gameStore.fetchRecentRooms();
    rooms.value = gameStore.getRecentRooms();
    // 重置滚动位置
    currentIndex.value = 0;
  } finally {
    loading.value = false;
  }
};

// 自动滚动
const startAutoScroll = () => {
  scrollInterval = setInterval(() => {
    if (rooms.value.length > 0) {
      currentIndex.value = (currentIndex.value + 1) % rooms.value.length;
    }
  }, 3000); // 每3秒滚动一次
};

// 启动定时刷新和自动滚动
const startRefreshInterval = () => {
  refreshInterval = setInterval(refreshRooms, 30000); // 每30秒刷新一次
  startAutoScroll();
};

onMounted(async () => {
  await refreshRooms();
  startRefreshInterval();
});

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (scrollInterval) {
    clearInterval(scrollInterval);
  }
});
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.slide-move {
  transition: transform 0.5s ease-in-out;
}

.battle-report .transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}
</style> 