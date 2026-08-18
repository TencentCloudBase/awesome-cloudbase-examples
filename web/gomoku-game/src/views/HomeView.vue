<template>
  <div class="home">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- 顶部标题 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-6">
          <i class="fas fa-chess-board text-blue-600 mr-2"></i>
          五子棋在线对战
        </h1>
        <p class="text-xl text-gray-600">
          创建房间或加入好友的房间，随时随地享受五子棋对战的乐趣！
        </p>
      </div>

      <!-- 创建和加入房间 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <router-link to="/create" 
          class="group bg-white rounded-lg shadow-md p-6 flex flex-col items-center transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 cursor-pointer">
          <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors duration-300">
            <i class="fas fa-plus text-blue-600 text-xl group-hover:scale-110 transform transition-transform duration-300"></i>
          </div>
          <h2 class="text-xl font-semibold mb-2 text-gray-800 group-hover:text-blue-600">创建房间</h2>
          <p class="text-gray-600 text-center group-hover:text-gray-700">
            创建一个新的游戏房间，邀请好友加入对战
          </p>
        </router-link>
        
        <router-link to="/join" 
          class="group bg-white rounded-lg shadow-md p-6 flex flex-col items-center transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 cursor-pointer">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors duration-300">
            <i class="fas fa-sign-in-alt text-green-600 text-xl group-hover:scale-110 transform transition-transform duration-300"></i>
          </div>
          <h2 class="text-xl font-semibold mb-2 text-gray-800 group-hover:text-green-600">加入房间</h2>
          <p class="text-gray-600 text-center group-hover:text-gray-700">
            通过房间ID和密码加入好友创建的游戏房间
          </p>
        </router-link>
      </div>

      <!-- 战况报告 -->
      <div class="mb-8">
        <BattleReport />
      </div>

      <!-- 排行榜 -->
      <div class="mb-8">
        <RankingList />
      </div>

      <!-- 游戏规则 -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">游戏规则</h2>
        <div class="text-left text-gray-700">
          <ul class="list-disc pl-5 space-y-2">
            <li>黑棋先行，双方轮流落子</li>
            <li>在棋盘上形成连续的五个或更多同色棋子（横向、纵向或斜向）即获胜</li>
            <li>如果棋盘下满仍无人获胜，则判定为平局</li>
            <li>创建房间的玩家执黑棋，加入房间的玩家执白棋</li>
            <li>游戏中可以通过分享链接邀请好友加入观战</li>
          </ul>
        </div>
      </div>
      
      <div class="text-gray-500 text-sm text-center space-y-2 mt-8">
        <p>© 2025 五子棋对战 | 实时对战 | 无需注册</p>
        <p>
          <a href="https://tcb.cloud.tencent.com" target="_blank" class="text-blue-500 hover:text-blue-600">云开发 CloudBase</a> | 
          <a href="https://www.npmjs.com/package/@cloudbase/cloudbase-mcp" target="_blank" class="text-blue-500 hover:text-blue-600">CloudBase MCP</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import BattleReport from '@/components/BattleReport.vue';
import RankingList from '@/components/RankingList.vue';
// 首页不需要特殊逻辑
</script> 