<template>
  <div class="game-board-container">
    <div class="game-board" :class="{ 'disabled': !canPlay }">
      <div 
        class="board-grid" 
        :style="{ 
          gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
          gridTemplateRows: `repeat(${boardSize}, 1fr)`
        }"
      >
        <div 
          v-for="row in boardSize" 
          :key="`row-${row-1}`"
        >
          <div
            v-for="col in boardSize"
            :key="`cell-${row-1}-${col-1}`"
            class="board-cell"
            @click="placeStone(row-1, col-1)"
          >
            <div 
              v-if="board[row-1][col-1]" 
              class="stone" 
              :class="[
                board[row-1][col-1] === 'black' ? 'black-stone' : 'white-stone',
                isLastMove(row-1, col-1) ? 'last-move' : ''
              ]"
            ></div>
            <div 
              v-if="showCoordinates" 
              class="coordinate"
            >{{ row-1 }},{{ col-1 }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue';
import { BOARD_SIZE } from '@/utils/gameUtils';

const props = defineProps({
  board: {
    type: Array,
    required: true
  },
  canPlay: {
    type: Boolean,
    default: false
  },
  lastMove: {
    type: Object,
    default: null
  },
  showCoordinates: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['place-stone']);

const boardSize = computed(() => props.board.length || BOARD_SIZE);

function placeStone(row, col) {
  if (!props.canPlay || props.board[row][col] !== null) return;
  emit('place-stone', row, col);
}

function isLastMove(row, col) {
  if (!props.lastMove) return false;
  return props.lastMove.row === row && props.lastMove.col === col;
}
</script>

<style scoped>
.game-board-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.game-board {
  width: 100%;
  padding-bottom: 100%;
  position: relative;
  background-color: #e6ca8d;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.game-board.disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.board-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-image: 
    repeating-linear-gradient(to right, transparent, transparent calc(100% / 15 - 1px), #000 calc(100% / 15 - 1px), #000 calc(100% / 15), transparent calc(100% / 15)),
    repeating-linear-gradient(to bottom, transparent, transparent calc(100% / 15 - 1px), #000 calc(100% / 15 - 1px), #000 calc(100% / 15), transparent calc(100% / 15));
}

.board-grid > div {
  display: flex;
  flex: 1;
}

.board-cell {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.stone {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  position: relative;
  z-index: 2;
}

.black-stone {
  background: radial-gradient(circle at 30% 30%, #666, #000);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.white-stone {
  background: radial-gradient(circle at 30% 30%, #fff, #ddd);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.last-move::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30%;
  height: 30%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 0, 0, 0.5);
  border-radius: 50%;
  z-index: 3;
}

.coordinate {
  position: absolute;
  font-size: 8px;
  color: rgba(0, 0, 0, 0.5);
  bottom: 0;
  right: 0;
  z-index: 1;
}
</style> 