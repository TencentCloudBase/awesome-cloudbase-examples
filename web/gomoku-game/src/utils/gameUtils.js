// 棋盘大小
export const BOARD_SIZE = 15;

// 玩家角色
export const PLAYER_ROLES = {
  BLACK: 'black',
  WHITE: 'white',
  SPECTATOR: 'spectator'
};

// 游戏状态
export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  BLACK_WIN: 'black_win',
  WHITE_WIN: 'white_win',
  DRAW: 'draw'
};

// 初始化棋盘
export function initBoard() {
  const board = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      board[i][j] = null;
    }
  }
  return board;
}

// 检查是否获胜
export function checkWin(board, row, col, player) {
  const directions = [
    [0, 1],   // 水平方向
    [1, 0],   // 垂直方向
    [1, 1],   // 右下方向
    [1, -1]   // 左下方向
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // 正向检查
    for (let i = 1; i < 5; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      
      if (
        newRow < 0 || newRow >= BOARD_SIZE ||
        newCol < 0 || newCol >= BOARD_SIZE ||
        board[newRow][newCol] !== player
      ) {
        break;
      }
      
      count++;
    }

    // 反向检查
    for (let i = 1; i < 5; i++) {
      const newRow = row - i * dx;
      const newCol = col - i * dy;
      
      if (
        newRow < 0 || newRow >= BOARD_SIZE ||
        newCol < 0 || newCol >= BOARD_SIZE ||
        board[newRow][newCol] !== player
      ) {
        break;
      }
      
      count++;
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

// 检查棋盘是否已满
export function isBoardFull(board) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] === null) {
        return false;
      }
    }
  }
  return true;
}

// 生成随机房间密码
export function generateRoomPassword() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 获取对手角色
export function getOpponentRole(role) {
  return role === PLAYER_ROLES.BLACK ? PLAYER_ROLES.WHITE : PLAYER_ROLES.BLACK;
}

// 获取当前玩家角色的中文名称
export function getPlayerRoleName(role) {
  switch (role) {
    case PLAYER_ROLES.BLACK:
      return '黑棋';
    case PLAYER_ROLES.WHITE:
      return '白棋';
    case PLAYER_ROLES.SPECTATOR:
      return '观战者';
    default:
      return '未知';
  }
}

// 获取游戏状态的中文描述
export function getGameStatusText(status) {
  switch (status) {
    case GAME_STATUS.WAITING:
      return '等待对手加入';
    case GAME_STATUS.PLAYING:
      return '游戏进行中';
    case GAME_STATUS.BLACK_WIN:
      return '黑棋获胜';
    case GAME_STATUS.WHITE_WIN:
      return '白棋获胜';
    case GAME_STATUS.DRAW:
      return '平局';
    default:
      return '未知状态';
  }
} 