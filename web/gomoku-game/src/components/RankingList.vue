<template>
  <div class="ranking-list bg-white shadow rounded-lg p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">玩家排行榜</h2>
      <button 
        @click="refreshRanking" 
        class="text-blue-600 hover:text-blue-800"
        :class="{ 'animate-spin': loading }"
      >
        <i class="fas fa-sync-alt"></i>
      </button>
    </div>

    <div class="space-y-4">
      <!-- 排行榜标题 -->
      <div class="grid grid-cols-6 text-sm font-medium text-gray-500 border-b pb-2">
        <div class="col-span-1">排名</div>
        <div class="col-span-2">玩家</div>
        <div class="col-span-1">胜</div>
        <div class="col-span-1">负</div>
        <div class="col-span-1">胜率</div>
      </div>

      <!-- 加载中状态 -->
      <div v-if="loading" class="text-center py-8">
        <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div class="text-gray-500 mt-2">加载中...</div>
      </div>

      <!-- 排行榜数据 -->
      <template v-else>
        <div 
          v-for="(player, index) in rankings" 
          :key="player.playerId"
          class="grid grid-cols-6 items-center py-2 hover:bg-gray-50 transition-colors"
          :class="{'bg-blue-50': player.playerId === currentPlayerId}"
        >
          <!-- 排名 -->
          <div class="col-span-1">
            <span 
              class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm"
              :class="getRankClass(index + 1)"
            >
              {{ index + 1 }}
            </span>
          </div>
          
          <!-- 玩家名称 -->
          <div class="col-span-2 font-medium truncate">
            {{ player.playerName }}
            <span v-if="player.playerId === currentPlayerId" class="text-xs text-blue-600 ml-1">(我)</span>
          </div>
          
          <!-- 胜场 -->
          <div class="col-span-1 text-green-600">
            {{ player.winCount || 0 }}
          </div>
          
          <!-- 负场 -->
          <div class="col-span-1 text-red-600">
            {{ player.loseCount || 0 }}
          </div>
          
          <!-- 胜率 -->
          <div class="col-span-1">
            {{ (player.winRate !== undefined ? player.winRate : calculateWinRate(player.winCount, player.loseCount)) }}%
          </div>
        </div>

        <!-- 无数据提示 -->
        <div v-if="rankings.length === 0" class="text-center py-8 text-gray-500">
          暂无排行数据
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();
const rankings = ref([]);
const loading = ref(false);

const currentPlayerId = computed(() => gameStore.playerId);

// 计算胜率
const calculateWinRate = (wins, losses) => {
  const total = (wins || 0) + (losses || 0);
  if (total === 0) return 0;
  return ((wins / total) * 100).toFixed(1);
};

// 获取排名样式
const getRankClass = (rank) => {
  switch (rank) {
    case 1:
      return 'bg-yellow-100 text-yellow-800';
    case 2:
      return 'bg-gray-100 text-gray-800';
    case 3:
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-50 text-gray-600';
  }
};

// 刷新排行榜
const refreshRanking = async () => {
  try {
    loading.value = true;
    const result = await gameStore.fetchRankings();
    rankings.value = result;
  } catch (error) {
    console.error('获取排行榜失败:', error);
  } finally {
    loading.value = false;
  }
};

// 组件加载时获取排行榜数据
onMounted(() => {
  refreshRanking();
});
</script> 