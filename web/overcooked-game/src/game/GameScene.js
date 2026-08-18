import Phaser from 'phaser';
import multiplayerManager from '../utils/multiplayerManager';
import floor_tile_img from '../assets/floor/floor.png';
import wall_tile_img from '../assets/wall/wall.png';

// Edward角色动画帧
import edward_down_0_img from '../assets/character/Edward/Edward-down-0.png';
import edward_down_1_img from '../assets/character/Edward/Edward-down-1.png';
import edward_down_2_img from '../assets/character/Edward/Edward-down-2.png';
import edward_down_3_img from '../assets/character/Edward/Edward-down-3.png';
import edward_up_0_img from '../assets/character/Edward/Edward-up-0.png';
import edward_up_1_img from '../assets/character/Edward/Edward-up-1.png';
import edward_up_2_img from '../assets/character/Edward/Edward-up-2.png';
import edward_up_3_img from '../assets/character/Edward/Edward-up-3.png';
import edward_left_0_img from '../assets/character/Edward/Edward-left-0.png';
import edward_left_1_img from '../assets/character/Edward/Edward-left-1.png';
import edward_left_2_img from '../assets/character/Edward/Edward-left-2.png';
import edward_left_3_img from '../assets/character/Edward/Edward-left-3.png';
import edward_right_0_img from '../assets/character/Edward/Edward-right-0.png';
import edward_right_1_img from '../assets/character/Edward/Edward-right-1.png';
import edward_right_2_img from '../assets/character/Edward/Edward-right-2.png';
import edward_right_3_img from '../assets/character/Edward/Edward-right-3.png';

// Abby角色动画帧
import abby_down_0_img from '../assets/character/Abby/Abby-down-0.png';
import abby_down_1_img from '../assets/character/Abby/Abby-down-1.png';
import abby_down_2_img from '../assets/character/Abby/Abby-down-2.png';
import abby_down_3_img from '../assets/character/Abby/Abby-down-3.png';
import abby_up_0_img from '../assets/character/Abby/Abby-up-0.png';
import abby_up_1_img from '../assets/character/Abby/Abby-up-1.png';
import abby_up_2_img from '../assets/character/Abby/Abby-up-2.png';
import abby_up_3_img from '../assets/character/Abby/Abby-up-3.png';
import abby_left_0_img from '../assets/character/Abby/Abby-left-0.png';
import abby_left_1_img from '../assets/character/Abby/Abby-left-1.png';
import abby_left_2_img from '../assets/character/Abby/Abby-left-2.png';
import abby_left_3_img from '../assets/character/Abby/Abby-left-3.png';
import abby_right_0_img from '../assets/character/Abby/Abby-right-0.png';
import abby_right_1_img from '../assets/character/Abby/Abby-right-1.png';
import abby_right_2_img from '../assets/character/Abby/Abby-right-2.png';
import abby_right_3_img from '../assets/character/Abby/Abby-right-3.png';

// 工作台和物品资源
import cutting_station_img from '../assets/item/切菜台.png';
import cooking_station_img from '../assets/item/烹饪台.png';
import serving_station_img from '../assets/item/出餐台.png';
import wash_station_img from '../assets/item/洗碗台.png';
import plate_sprite_img from '../assets/item/盘子.png';

// 音频资源
import bgm_audio from '../assets/sound/厨房大作战.mp3';

export default class GameScene extends Phaser.Scene {
	constructor() {
		super({ key: 'GameScene' });

		// 游戏状态
		this.player = null;
		this.otherPlayers = new Map(); // 存储其他玩家
		this.cursors = null;
		this.wasdKeys = null;
		this.spaceKey = null;
		this.eKey = null;
		this.qKey = null;

		// 游戏对象组
		this.ingredients = null;
		this.stations = null;
		this.plates = null;
		this.washStation = null; // 洗碗槽
		this.groundItems = null; // 地面物品组
		this.orders = [];
		this.currentOrder = null;

		// 玩家状态
		this.playerHolding = null;
		this.score = 0;
		this.timeLeft = 180; // 3分钟
		this.completedOrders = 0;

		// UI元素
		this.scoreText = null;
		this.timerText = null;
		this.orderText = null;
		this.holdingText = null;
		this.messageText = null;

		// 视觉反馈元素
		this.playerHoldingSprite = null;
		this.plateContentsSprites = [];
		this.stationContentsSprites = [];

		// 音频元素
		this.bgmSound = null;

		// 游戏配置
		this.gameConfig = {
			playerSpeed: 160,
			interactionDistance: 40,
			cookingTime: 3000, // 3秒烹饪时间
			choppingTime: 2000, // 2秒切菜时间
			fireCountdownTime: 5000, // 5秒着火倒计时
			washTime: 2000, // 2秒洗碗时间
		};

		// 食材和菜谱配置 - 调整订单时间
		this.recipes = {
			simple_salad: {
				name: '简单沙拉',
				ingredients: ['chopped_lettuce'],
				points: 10,
				time: 60, // 增加到60秒
			},
			tomato_salad: {
				name: '番茄沙拉',
				ingredients: ['chopped_tomato', 'chopped_lettuce'],
				points: 15,
				time: 90, // 增加到90秒
			},
			sandwich: {
				name: '三明治',
				ingredients: ['bread', 'cooked_tomato', 'chopped_lettuce'],
				points: 25,
				time: 120, // 增加到120秒
			},
			cooked_meal: {
				name: '熟食套餐',
				ingredients: ['cooked_tomato', 'cooked_lettuce', 'bread'],
				points: 30,
				time: 150, // 增加到150秒
			},
		};

		// 动画状态
		this.isProcessing = false;
		this.processingStation = null;

		// 游戏状态标志
		this.gameStarted = false;
		this.gameEnded = false;

		// 多人游戏相关
		this.gameMode = 'single'; // 'single' 或 'multiplayer'
		this.currentPlayerId = null;
		this.syncTimer = null;
		this.lastSyncPosition = null;
		this.lastSyncHolding = null; // 添加手持物品同步状态
		this.isSyncingPosition = false;

		// 游戏对象ID管理
		this.objectIdCounter = 0;
		this.plateIdMap = new Map(); // 盘子对象到ID的映射
		this.stationIdMap = new Map(); // 工作台对象到ID的映射
		this.washStationIdMap = new Map(); // 洗碗槽对象到ID的映射
		this.groundItemIdMap = new Map(); // 地面物品对象到ID的映射

		// 盘子管理系统 - 新增
		this.platePool = []; // 盘子池，固定4个盘子
		this.maxPlates = 4; // 最大盘子数量

		// 多人模式分数同步保护
		this.isProcessingOrder = false; // 标记当前用户是否正在处理订单完成
		this.lastOrderCompletionTime = 0; // 上次完成订单的时间戳

		// 时间同步机制（多人模式）
		this.gameStartTime = null; // 游戏开始时间戳（服务器时间）
		this.gameEndTime = null; // 游戏结束时间戳（服务器时间）
		this.gameDuration = 180000; // 游戏总时长（毫秒）
		this.serverTimeOffset = 0; // 服务器时间偏移量
		this.lastTimeSync = 0; // 上次时间同步的时间戳
		this.timeSyncInterval = 30000; // 时间同步间隔（30秒）
	}

	preload() {
		// 加载地板和墙壁资源
		this.load.image('floor_tile', floor_tile_img);
		this.load.image('wall_tile', wall_tile_img);

		// 加载Edward角色动画帧
		this.load.image('edward_down_0', edward_down_0_img);
		this.load.image('edward_down_1', edward_down_1_img);
		this.load.image('edward_down_2', edward_down_2_img);
		this.load.image('edward_down_3', edward_down_3_img);
		this.load.image('edward_up_0', edward_up_0_img);
		this.load.image('edward_up_1', edward_up_1_img);
		this.load.image('edward_up_2', edward_up_2_img);
		this.load.image('edward_up_3', edward_up_3_img);
		this.load.image('edward_left_0', edward_left_0_img);
		this.load.image('edward_left_1', edward_left_1_img);
		this.load.image('edward_left_2', edward_left_2_img);
		this.load.image('edward_left_3', edward_left_3_img);
		this.load.image('edward_right_0', edward_right_0_img);
		this.load.image('edward_right_1', edward_right_1_img);
		this.load.image('edward_right_2', edward_right_2_img);
		this.load.image('edward_right_3', edward_right_3_img);

		// 加载Abby角色动画帧
		this.load.image('abby_down_0', abby_down_0_img);
		this.load.image('abby_down_1', abby_down_1_img);
		this.load.image('abby_down_2', abby_down_2_img);
		this.load.image('abby_down_3', abby_down_3_img);
		this.load.image('abby_up_0', abby_up_0_img);
		this.load.image('abby_up_1', abby_up_1_img);
		this.load.image('abby_up_2', abby_up_2_img);
		this.load.image('abby_up_3', abby_up_3_img);
		this.load.image('abby_left_0', abby_left_0_img);
		this.load.image('abby_left_1', abby_left_1_img);
		this.load.image('abby_left_2', abby_left_2_img);
		this.load.image('abby_left_3', abby_left_3_img);
		this.load.image('abby_right_0', abby_right_0_img);
		this.load.image('abby_right_1', abby_right_1_img);
		this.load.image('abby_right_2', abby_right_2_img);
		this.load.image('abby_right_3', abby_right_3_img);

		// 加载工作台和物品资源
		this.load.image('cutting_station', cutting_station_img);
		this.load.image('cooking_station', cooking_station_img);
		this.load.image('serving_station', serving_station_img);
		this.load.image('wash_station', wash_station_img);
		this.load.image('plate_sprite', plate_sprite_img);

		// 加载音频资源
		this.load.audio('bgm', bgm_audio);

		// 创建食材和其他物品的像素艺术图形
		this.createPixelArt();
	}

	createPixelArt() {
		// 创建食材图形 - 生菜
		const lettuceGraphics = this.add.graphics();
		lettuceGraphics.fillStyle(0x90ee90);
		lettuceGraphics.fillCircle(16, 16, 12);
		lettuceGraphics.fillStyle(0x228b22);
		lettuceGraphics.fillCircle(16, 16, 8);
		lettuceGraphics.generateTexture('lettuce', 32, 32);
		lettuceGraphics.destroy();

		// 创建食材图形 - 番茄
		const tomatoGraphics = this.add.graphics();
		tomatoGraphics.fillStyle(0xff6347);
		tomatoGraphics.fillCircle(16, 16, 12);
		tomatoGraphics.fillStyle(0x228b22);
		tomatoGraphics.fillRect(14, 4, 4, 8);
		tomatoGraphics.generateTexture('tomato', 32, 32);
		tomatoGraphics.destroy();

		// 创建食材图形 - 面包
		const breadGraphics = this.add.graphics();
		breadGraphics.fillStyle(0xdeb887);
		breadGraphics.fillRoundedRect(4, 8, 24, 16, 4);
		breadGraphics.fillStyle(0xf4a460);
		breadGraphics.fillRoundedRect(6, 10, 20, 12, 3);
		breadGraphics.generateTexture('bread', 32, 32);
		breadGraphics.destroy();

		// 创建切好的食材图形
		const choppedLettuceGraphics = this.add.graphics();
		choppedLettuceGraphics.fillStyle(0x90ee90);
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				choppedLettuceGraphics.fillRect(6 + i * 6, 6 + j * 6, 4, 4);
			}
		}
		choppedLettuceGraphics.generateTexture('chopped_lettuce', 32, 32);
		choppedLettuceGraphics.destroy();

		const choppedTomatoGraphics = this.add.graphics();
		choppedTomatoGraphics.fillStyle(0xff6347);
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				choppedTomatoGraphics.fillRect(6 + i * 6, 6 + j * 6, 4, 4);
			}
		}
		choppedTomatoGraphics.generateTexture('chopped_tomato', 32, 32);
		choppedTomatoGraphics.destroy();

		// 创建熟食图形
		const cookedLettuceGraphics = this.add.graphics();
		cookedLettuceGraphics.fillStyle(0x6b8e23);
		cookedLettuceGraphics.fillCircle(16, 16, 10);
		cookedLettuceGraphics.fillStyle(0x556b2f);
		cookedLettuceGraphics.fillCircle(16, 16, 6);
		cookedLettuceGraphics.generateTexture('cooked_lettuce', 32, 32);
		cookedLettuceGraphics.destroy();

		const cookedTomatoGraphics = this.add.graphics();
		cookedTomatoGraphics.fillStyle(0xb22222);
		cookedTomatoGraphics.fillCircle(16, 16, 10);
		cookedTomatoGraphics.fillStyle(0x8b0000);
		cookedTomatoGraphics.fillCircle(16, 16, 6);
		cookedTomatoGraphics.generateTexture('cooked_tomato', 32, 32);
		cookedTomatoGraphics.destroy();

		// 创建烧焦食材图形
		const burntGraphics = this.add.graphics();
		burntGraphics.fillStyle(0x2f2f2f);
		burntGraphics.fillCircle(16, 16, 10);
		burntGraphics.fillStyle(0x000000);
		burntGraphics.fillCircle(16, 16, 6);
		burntGraphics.generateTexture('burnt_food', 32, 32);
		burntGraphics.destroy();

		// 创建垃圾桶图形
		const trashGraphics = this.add.graphics();
		trashGraphics.fillStyle(0x696969);
		trashGraphics.fillRect(8, 12, 16, 20);
		trashGraphics.fillStyle(0x2f2f2f);
		trashGraphics.fillRect(6, 8, 20, 4);
		trashGraphics.fillStyle(0x808080);
		trashGraphics.fillRect(10, 16, 12, 12);
		trashGraphics.generateTexture('trash', 32, 32);
		trashGraphics.destroy();

		// 创建灭火器图形
		const extinguisherGraphics = this.add.graphics();
		extinguisherGraphics.fillStyle(0xff0000);
		extinguisherGraphics.fillRect(12, 8, 8, 20);
		extinguisherGraphics.fillStyle(0x000000);
		extinguisherGraphics.fillRect(14, 4, 4, 8);
		extinguisherGraphics.fillStyle(0xc0c0c0);
		extinguisherGraphics.fillRect(10, 26, 12, 4);
		extinguisherGraphics.generateTexture('extinguisher', 32, 32);
		extinguisherGraphics.destroy();

		// 创建脏盘子图形
		const dirtyPlateGraphics = this.add.graphics();
		dirtyPlateGraphics.fillStyle(0x8b4513);
		dirtyPlateGraphics.fillCircle(16, 16, 14);
		dirtyPlateGraphics.fillStyle(0x654321);
		dirtyPlateGraphics.fillCircle(16, 16, 10);
		// 添加污渍
		dirtyPlateGraphics.fillStyle(0x4a4a4a);
		dirtyPlateGraphics.fillCircle(12, 12, 2);
		dirtyPlateGraphics.fillCircle(20, 14, 2);
		dirtyPlateGraphics.fillCircle(16, 20, 2);
		dirtyPlateGraphics.generateTexture('dirty_plate', 32, 32);
		dirtyPlateGraphics.destroy();

		// 创建干净盘子图形
		const plateGraphics = this.add.graphics();
		plateGraphics.fillStyle(0xf0f0f0);
		plateGraphics.fillCircle(16, 16, 14);
		plateGraphics.fillStyle(0xe0e0e0);
		plateGraphics.fillCircle(16, 16, 10);
		plateGraphics.generateTexture('plate', 32, 32);
		plateGraphics.destroy();

		// 创建装好的盘子图形
		const preparedPlateGraphics = this.add.graphics();
		preparedPlateGraphics.fillStyle(0xf0f0f0);
		preparedPlateGraphics.fillCircle(16, 16, 14);
		preparedPlateGraphics.fillStyle(0xe0e0e0);
		preparedPlateGraphics.fillCircle(16, 16, 10);
		// 添加食物装饰
		preparedPlateGraphics.fillStyle(0x90ee90);
		preparedPlateGraphics.fillCircle(12, 12, 3);
		preparedPlateGraphics.fillStyle(0xff6347);
		preparedPlateGraphics.fillCircle(20, 12, 3);
		preparedPlateGraphics.generateTexture('prepared_plate', 32, 32);
		preparedPlateGraphics.destroy();

		// 创建着火烹饪台图形
		const fireCookingStationGraphics = this.add.graphics();
		fireCookingStationGraphics.fillStyle(0x8b4513);
		fireCookingStationGraphics.fillRect(4, 4, 56, 56);
		fireCookingStationGraphics.fillStyle(0xff4500);
		fireCookingStationGraphics.fillRect(8, 8, 48, 48);
		// 添加火焰效果
		fireCookingStationGraphics.fillStyle(0xff0000);
		fireCookingStationGraphics.fillTriangle(16, 16, 24, 8, 32, 16);
		fireCookingStationGraphics.fillTriangle(32, 16, 40, 8, 48, 16);
		fireCookingStationGraphics.generateTexture('fire_cooking_station', 64, 64);
		fireCookingStationGraphics.destroy();

		// 创建粒子纹理
		const particleGraphics = this.add.graphics();
		particleGraphics.fillStyle(0xffd700);
		particleGraphics.fillCircle(8, 8, 4);
		particleGraphics.generateTexture('particle', 16, 16);
		particleGraphics.destroy();
	}

	createCharacterAnimations() {
		// 创建Edward角色动画
		this.anims.create({
			key: 'edward_walk_down',
			frames: [
				{ key: 'edward_down_0' },
				{ key: 'edward_down_1' },
				{ key: 'edward_down_2' },
				{ key: 'edward_down_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'edward_walk_up',
			frames: [
				{ key: 'edward_up_0' },
				{ key: 'edward_up_1' },
				{ key: 'edward_up_2' },
				{ key: 'edward_up_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'edward_walk_left',
			frames: [
				{ key: 'edward_left_0' },
				{ key: 'edward_left_1' },
				{ key: 'edward_left_2' },
				{ key: 'edward_left_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'edward_walk_right',
			frames: [
				{ key: 'edward_right_0' },
				{ key: 'edward_right_1' },
				{ key: 'edward_right_2' },
				{ key: 'edward_right_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'edward_idle_down',
			frames: [{ key: 'edward_down_0' }],
			frameRate: 1,
		});

		this.anims.create({
			key: 'edward_idle_up',
			frames: [{ key: 'edward_up_0' }],
			frameRate: 1,
		});

		this.anims.create({
			key: 'edward_idle_left',
			frames: [{ key: 'edward_left_0' }],
			frameRate: 1,
		});

		this.anims.create({
			key: 'edward_idle_right',
			frames: [{ key: 'edward_right_0' }],
			frameRate: 1,
		});

		// 创建Abby角色动画
		this.anims.create({
			key: 'abby_walk_down',
			frames: [
				{ key: 'abby_down_0' },
				{ key: 'abby_down_1' },
				{ key: 'abby_down_2' },
				{ key: 'abby_down_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'abby_walk_up',
			frames: [
				{ key: 'abby_up_0' },
				{ key: 'abby_up_1' },
				{ key: 'abby_up_2' },
				{ key: 'abby_up_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'abby_walk_left',
			frames: [
				{ key: 'abby_left_0' },
				{ key: 'abby_left_1' },
				{ key: 'abby_left_2' },
				{ key: 'abby_left_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'abby_walk_right',
			frames: [
				{ key: 'abby_right_0' },
				{ key: 'abby_right_1' },
				{ key: 'abby_right_2' },
				{ key: 'abby_right_3' },
			],
			frameRate: 8,
			repeat: -1,
		});

		this.anims.create({
			key: 'abby_idle_down',
			frames: [{ key: 'abby_down_0' }],
			frameRate: 1,
		});

		this.anims.create({
			key: 'abby_idle_up',
			frames: [{ key: 'abby_up_0' }],
			frameRate: 1,
		});

		this.anims.create({
			key: 'abby_idle_left',
			frames: [{ key: 'abby_left_0' }],
			frameRate: 1,
		});

		this.anims.create({
			key: 'abby_idle_right',
			frames: [{ key: 'abby_right_0' }],
			frameRate: 1,
		});
	}

	create() {
		// 重置游戏状态
		this.gameStarted = false;
		this.gameEnded = false;
		this.score = 0;
		this.timeLeft = 180;
		this.completedOrders = 0;
		this.playerHolding = null;
		this.currentOrder = null;

		// 清理之前的计时器
		if (this.gameTimer) {
			this.gameTimer.remove();
			this.gameTimer = null;
		}
		if (this.orderTimer) {
			this.orderTimer.remove();
			this.orderTimer = null;
		}

		// 创建角色动画
		this.createCharacterAnimations();

		// 检查游戏模式
		this.gameMode = this.gameMode || 'single';

		// 创建厨房背景
		this.createKitchenLayout();

		// 初始化多人游戏
		if (this.gameMode === 'multiplayer') {
			this.initMultiplayerGame();
		} else {
			this.initSinglePlayerGame();
		}

		// 创建输入控制
		this.setupControls();

		// 创建游戏对象
		this.createGameObjects();

		// 创建UI
		this.createUI();

		// 设置碰撞检测
		this.setupCollisions();

		// 添加粒子效果系统
		this.setupParticleEffects();

		// 启动游戏
		this.startGame();
	}

	initSinglePlayerGame() {
		// 创建单人玩家（Edward）
		this.player = this.physics.add.sprite(100, 300, 'edward_down_0');
		this.player.setCollideWorldBounds(true);
		this.player.setDepth(10);
		this.player.setSize(24, 32);
		this.player.setData('playerId', 'single_player');
		this.player.setData('playerType', 'edward');
		this.player.setData('currentDirection', 'down');

		// 播放默认待机动画
		this.player.play('edward_idle_down');
	}

	initMultiplayerGame() {
		// 获取当前玩家信息
		this.currentPlayerId = multiplayerManager.playerId;
		const roomData = multiplayerManager.getRoomData();

		console.log('初始化多人游戏:', {
			currentPlayerId: this.currentPlayerId,
			roomData: roomData,
		});

		// 确保当前玩家始终被创建的标志
		let currentPlayerCreated = false;

		if (roomData && roomData.players && Array.isArray(roomData.players)) {
			// 为每个玩家创建角色
			roomData.players.forEach((playerData, index) => {
				const isCurrentPlayer = playerData.playerId === this.currentPlayerId;
				const playerType = index === 0 ? 'edward' : 'abby'; // 第一个玩家是Edward，第二个是Abby
				const texture =
					playerType === 'edward' ? 'edward_down_0' : 'abby_down_0';

				// 设置初始位置（如果没有位置信息）
				const startX = playerData.position?.x || 100 + index * 100;
				const startY = playerData.position?.y || 300;

				console.log('创建玩家:', {
					playerId: playerData.playerId,
					isCurrentPlayer,
					playerType,
					texture,
					position: { x: startX, y: startY },
				});

				if (isCurrentPlayer) {
					// 创建当前玩家
					this.player = this.physics.add.sprite(startX, startY, texture);
					this.player.setCollideWorldBounds(true);
					this.player.setDepth(10);
					this.player.setSize(24, 32);
					this.player.setData('playerId', playerData.playerId);
					this.player.setData('playerType', playerType);
					this.player.setData('currentDirection', 'down');

					// 播放默认待机动画
					this.player.play(`${playerType}_idle_down`);

					currentPlayerCreated = true;
					console.log('当前玩家创建完成:', this.player);
				} else {
					// 创建其他玩家
					const otherPlayer = this.physics.add.sprite(startX, startY, texture);
					otherPlayer.setCollideWorldBounds(true);
					otherPlayer.setDepth(10);
					otherPlayer.setSize(24, 32);
					otherPlayer.setData('playerId', playerData.playerId);
					otherPlayer.setData('playerType', playerType);
					otherPlayer.setData('currentDirection', 'down');

					// 播放默认待机动画
					otherPlayer.play(`${playerType}_idle_down`);

					// 添加玩家名称标签
					const nameText = this.add.text(
						startX,
						startY - 40,
						playerData.nickname || `玩家${index + 1}`,
						{
							fontSize: '12px',
							fill: '#ffffff',
							backgroundColor: '#000000',
							padding: { x: 4, y: 2 },
						}
					);
					nameText.setOrigin(0.5);
					nameText.setDepth(11);

					const otherPlayerObj = {
						sprite: otherPlayer,
						nameText: nameText,
						data: playerData,
						holdingSprite: null, // 初始化手持物品精灵
					};

					this.otherPlayers.set(playerData.playerId, otherPlayerObj);

					// 为新玩家设置墙壁碰撞
					if (this.walls) {
						this.physics.add.collider(otherPlayer, this.walls);
					}

					// 如果玩家有手持物品，立即显示
					if (playerData.holding) {
						this.updateOtherPlayerHolding(otherPlayerObj, playerData.holding);
					}

					console.log('其他玩家创建完成:', {
						playerId: playerData.playerId,
						sprite: otherPlayer,
						nameText: nameText,
					});
				}
			});
		}

		// 如果当前玩家没有被创建（房间数据有问题或找不到匹配的玩家），创建一个默认的当前玩家
		if (!currentPlayerCreated) {
			console.warn('⚠️ 当前玩家未在房间数据中找到，创建默认玩家');

			// 创建默认的当前玩家
			this.player = this.physics.add.sprite(100, 300, 'edward_down_0');
			this.player.setCollideWorldBounds(true);
			this.player.setDepth(10);
			this.player.setSize(24, 32);
			this.player.setData('playerId', this.currentPlayerId || 'default_player');
			this.player.setData('playerType', 'edward');
			this.player.setData('currentDirection', 'down');

			// 播放默认待机动画
			this.player.play('edward_idle_down');

			console.log('默认当前玩家创建完成:', this.player);
		}

		// 确保 this.player 存在
		if (!this.player) {
			console.error('❌ 严重错误：当前玩家创建失败，回退到单人模式');
			this.gameMode = 'single';
			this.initSinglePlayerGame();
			return;
		}

		console.log('多人游戏初始化完成:', {
			player: this.player,
			playerId: this.player.getData('playerId'),
			playerType: this.player.getData('playerType'),
			otherPlayers: this.otherPlayers.size,
		});

		// 监听多人游戏事件
		this.setupMultiplayerListeners();

		// 开始同步
		this.startMultiplayerSync();
	}

	setupMultiplayerListeners() {
		console.log('🎯 设置多人游戏事件监听器');

		// 监听房间状态更新
		multiplayerManager.on('roomUpdated', (roomData) => {
			console.log('🏠 收到房间状态更新:', roomData);
			this.updateOtherPlayers(roomData);
		});

		// 监听游戏状态更新
		multiplayerManager.on('gameStateUpdated', (gameState) => {
			console.log('🎮 收到游戏状态更新:', gameState);
			this.updateGameStateFromServer(gameState);
		});
	}

	startMultiplayerSync() {
		// 每200ms同步一次玩家位置（降低频率避免登录循环）
		this.syncTimer = this.time.addEvent({
			delay: 200,
			callback: this.syncPlayerPosition,
			callbackScope: this,
			loop: true,
		});

		// 添加同步状态标志
		this.isSyncingPosition = false;

		console.log('🔄 开始多人游戏位置同步');
	}

	syncPlayerPosition() {
		if (
			this.player &&
			this.gameMode === 'multiplayer' &&
			!this.isSyncingPosition
		) {
			const currentPosition = {
				x: Math.round(this.player.x),
				y: Math.round(this.player.y),
			};

			// 获取当前手持物品信息
			const currentHolding = this.playerHolding
				? {
						type: this.playerHolding.type,
						contents: this.playerHolding.contents || null,
				  }
				: null;

			// 检查位置或手持物品是否发生变化
			const positionChanged =
				!this.lastSyncPosition ||
				Math.abs(this.lastSyncPosition.x - currentPosition.x) > 5 ||
				Math.abs(this.lastSyncPosition.y - currentPosition.y) > 5;

			const holdingChanged =
				JSON.stringify(this.lastSyncHolding) !== JSON.stringify(currentHolding);

			// 只有位置或手持物品发生明显变化时才同步
			if (positionChanged || holdingChanged) {
				this.lastSyncPosition = { ...currentPosition };
				this.lastSyncHolding = currentHolding ? { ...currentHolding } : null;
				this.isSyncingPosition = true;

				console.log('🚀 发送玩家状态同步:', {
					playerId: this.currentPlayerId,
					position: currentPosition,
					holding: currentHolding,
					positionChanged,
					holdingChanged,
					roomId: multiplayerManager.roomId,
				});

				// 异步同步，不阻塞游戏
				multiplayerManager
					.syncPlayerAction('move', {
						position: currentPosition,
						holding: currentHolding, // 添加手持物品信息
					})
					.then((result) => {
						if (result && result.result && result.result.success) {
							console.log('✅ 玩家状态同步成功:', {
								position: currentPosition,
								holding: currentHolding,
								playerId: this.currentPlayerId,
								result: result.result,
							});
						} else {
							console.error('❌ 玩家状态同步失败:', {
								position: currentPosition,
								holding: currentHolding,
								playerId: this.currentPlayerId,
								result: result,
							});
						}
					})
					.catch((error) => {
						console.error('💥 玩家状态同步出错:', {
							position: currentPosition,
							holding: currentHolding,
							playerId: this.currentPlayerId,
							error: error.message,
							stack: error.stack,
						});
					})
					.finally(() => {
						this.isSyncingPosition = false;
					});
			}
		} else {
			// 添加调试信息，了解为什么没有同步
			if (this.gameMode === 'multiplayer' && Math.random() < 0.1) {
				// 10%概率打印
				console.log('🔍 玩家状态同步跳过:', {
					hasPlayer: !!this.player,
					gameMode: this.gameMode,
					isSyncingPosition: this.isSyncingPosition,
					currentPosition: this.player
						? { x: this.player.x, y: this.player.y }
						: null,
					currentHolding: this.playerHolding,
					lastSyncPosition: this.lastSyncPosition,
					lastSyncHolding: this.lastSyncHolding,
				});
			}
		}
	}

	updateOtherPlayers(roomData) {
		if (!roomData || !roomData.players) {
			console.log('⚠️ 房间数据无效，跳过更新');
			return;
		}

		console.log('👥 更新其他玩家:', {
			totalPlayers: roomData.players.length,
			currentPlayerId: this.currentPlayerId,
			players: roomData.players.map((p) => ({
				id: p.playerId,
				nickname: p.nickname,
				position: p.position,
				holding: p.holding, // 添加手持物品信息
			})),
		});

		// 处理每个玩家
		roomData.players.forEach((playerData, index) => {
			if (playerData.playerId !== this.currentPlayerId) {
				const otherPlayer = this.otherPlayers.get(playerData.playerId);

				if (otherPlayer && playerData.position) {
					// 更新现有玩家位置
					otherPlayer.sprite.setPosition(
						playerData.position.x,
						playerData.position.y
					);
					otherPlayer.nameText.setPosition(
						playerData.position.x,
						playerData.position.y - 40
					);

					// 更新手持物品位置（如果存在）
					if (otherPlayer.holdingSprite) {
						otherPlayer.holdingSprite.setPosition(
							playerData.position.x + 20,
							playerData.position.y - 10
						);
					}

					// 更新玩家数据
					otherPlayer.data = playerData;

					// 更新手持物品显示
					this.updateOtherPlayerHolding(otherPlayer, playerData.holding);

					console.log('📍 更新玩家状态:', {
						playerId: playerData.playerId,
						nickname: playerData.nickname,
						position: playerData.position,
						holding: playerData.holding,
					});
				} else if (!otherPlayer) {
					// 如果其他玩家不存在，创建它
					console.log('➕ 发现新玩家，创建角色:', playerData);
					this.createOtherPlayer(playerData, index);
				}
			} else {
				// 更新当前玩家的服务器端数据（但不改变位置，因为位置由本地控制）
				console.log('🎯 当前玩家数据:', {
					playerId: playerData.playerId,
					nickname: playerData.nickname,
					serverPosition: playerData.position,
					serverHolding: playerData.holding,
					localPosition: this.player
						? { x: this.player.x, y: this.player.y }
						: null,
					localHolding: this.playerHolding,
				});
			}
		});

		// 检查是否有玩家离开了房间
		this.otherPlayers.forEach((otherPlayer, playerId) => {
			const stillInRoom = roomData.players.some((p) => p.playerId === playerId);
			if (!stillInRoom) {
				console.log('➖ 玩家离开房间，移除角色:', playerId);
				otherPlayer.sprite.destroy();
				otherPlayer.nameText.destroy();
				// 清理手持物品显示
				if (otherPlayer.holdingSprite) {
					otherPlayer.holdingSprite.destroy();
				}
				this.otherPlayers.delete(playerId);
			}
		});
	}

	// 更新其他玩家的手持物品显示
	updateOtherPlayerHolding(otherPlayer, holdingData) {
		// 检查otherPlayer是否存在
		if (!otherPlayer || !otherPlayer.sprite) {
			console.warn('⚠️ otherPlayer或其sprite不存在，跳过手持物品更新');
			return;
		}

		// 检查场景是否已初始化
		if (!this.add || !this.tweens) {
			console.warn('⚠️ 场景未完全初始化，跳过手持物品更新');
			return;
		}

		// 清除之前的手持物品显示
		if (otherPlayer.holdingSprite) {
			otherPlayer.holdingSprite.destroy();
			otherPlayer.holdingSprite = null;
		}

		// 如果玩家手持物品，在角色旁边显示
		if (holdingData && holdingData.type) {
			try {
				// 🔧 修复：确保使用正确的纹理名称
				let textureKey = holdingData.type;
				if (textureKey === 'plate') {
					textureKey = 'plate_sprite'; // 使用plate_sprite纹理而不是不存在的plate纹理
				}

				otherPlayer.holdingSprite = this.add.sprite(
					otherPlayer.sprite.x + 20,
					otherPlayer.sprite.y - 10,
					textureKey
				);
				otherPlayer.holdingSprite.setScale(0.6);
				otherPlayer.holdingSprite.setDepth(15);

				// 添加轻微的浮动动画
				this.tweens.add({
					targets: otherPlayer.holdingSprite,
					y: otherPlayer.sprite.y - 15,
					duration: 1000,
					yoyo: true,
					repeat: -1,
					ease: 'Sine.easeInOut',
				});

				console.log('🎒 更新其他玩家手持物品:', {
					playerId: otherPlayer.data?.playerId,
					holding: holdingData,
				});
			} catch (error) {
				console.error('❌ 创建其他玩家手持物品精灵失败:', {
					error: error.message,
					holdingData,
					playerId: otherPlayer.data?.playerId,
					sceneState: {
						hasAdd: !!this.add,
						hasTweens: !!this.tweens,
						sceneActive: this.scene?.isActive(),
					},
				});
			}
		}
	}

	createOtherPlayer(playerData, playerIndex) {
		// 确定玩家类型（基于房间中的顺序）
		const roomData = multiplayerManager.getRoomData();
		const actualIndex = roomData.players.findIndex(
			(p) => p.playerId === playerData.playerId
		);
		const playerType = actualIndex === 0 ? 'edward' : 'abby';
		const texture = playerType === 'edward' ? 'edward_down_0' : 'abby_down_0';

		const startX = playerData.position?.x || 100 + actualIndex * 100;
		const startY = playerData.position?.y || 300;

		console.log('👤 创建其他玩家:', {
			playerId: playerData.playerId,
			nickname: playerData.nickname,
			playerType,
			texture,
			position: { x: startX, y: startY },
			holding: playerData.holding, // 添加手持物品信息
			actualIndex,
		});

		// 创建其他玩家精灵
		const otherPlayer = this.physics.add.sprite(startX, startY, texture);
		otherPlayer.setCollideWorldBounds(true);
		otherPlayer.setDepth(10);
		otherPlayer.setSize(24, 32);
		otherPlayer.setData('playerId', playerData.playerId);
		otherPlayer.setData('playerType', playerType);
		otherPlayer.setData('currentDirection', 'down');

		// 添加玩家名称标签
		const nameText = this.add.text(
			startX,
			startY - 40,
			playerData.nickname || `玩家${actualIndex + 1}`,
			{
				fontSize: '12px',
				fill: '#ffffff',
				backgroundColor: '#000000',
				padding: { x: 4, y: 2 },
			}
		);
		nameText.setOrigin(0.5);
		nameText.setDepth(11);

		const otherPlayerObj = {
			sprite: otherPlayer,
			nameText: nameText,
			data: playerData,
			holdingSprite: null, // 初始化手持物品精灵
		};

		this.otherPlayers.set(playerData.playerId, otherPlayerObj);

		// 为新玩家设置墙壁碰撞
		if (this.walls) {
			this.physics.add.collider(otherPlayer, this.walls);
		}

		// 如果玩家有手持物品，立即显示
		if (playerData.holding) {
			this.updateOtherPlayerHolding(otherPlayerObj, playerData.holding);
		}

		console.log('✅ 其他玩家创建完成:', {
			playerId: playerData.playerId,
			nickname: playerData.nickname,
			playerType,
			position: { x: startX, y: startY },
			holding: playerData.holding,
		});
	}

	updateGameStateFromServer(gameState) {
		console.log('🔄 从服务器更新游戏状态:', gameState);

		// 检查是否正在处理订单完成，如果是则跳过分数和订单数的同步
		const timeSinceLastOrder = Date.now() - this.lastOrderCompletionTime;
		const shouldSkipScoreSync =
			this.isProcessingOrder || timeSinceLastOrder < 3000; // 3秒保护期

		if (shouldSkipScoreSync) {
			console.log('🛡️ 订单处理保护期，跳过分数同步:', {
				isProcessingOrder: this.isProcessingOrder,
				timeSinceLastOrder,
				currentScore: this.score,
				serverScore: gameState.score,
			});
		}

		// 更新基本游戏状态
		if (gameState.currentOrder) {
			this.currentOrder = gameState.currentOrder;
		}

		// 只有在非保护期内才同步分数和订单数
		if (!shouldSkipScoreSync) {
			if (gameState.score !== undefined) {
				this.score = gameState.score;
			}
			if (gameState.completedOrders !== undefined) {
				this.completedOrders = gameState.completedOrders;
			}
		}

		// 🕐 时间同步：使用服务器时间戳而不是直接同步timeLeft
		if (gameState.gameStartTime !== undefined) {
			this.gameStartTime = gameState.gameStartTime;
			console.log('🕐 同步游戏开始时间戳:', this.gameStartTime);
		}

		if (gameState.gameEndTime !== undefined) {
			this.gameEndTime = gameState.gameEndTime;
			console.log('🕐 同步游戏结束时间戳:', this.gameEndTime);
		}

		if (gameState.gameDuration !== undefined) {
			this.gameDuration = gameState.gameDuration;
			console.log('🕐 同步游戏总时长:', this.gameDuration);
		}

		if (gameState.serverTimeOffset !== undefined) {
			this.serverTimeOffset = gameState.serverTimeOffset;
			console.log('🕐 同步服务器时间偏移:', this.serverTimeOffset);
		}

		// 如果是多人模式且已经获取到时间戳，启动基于时间戳的计时器
		if (
			this.gameMode === 'multiplayer' &&
			this.gameStartTime &&
			!this.gameTimer
		) {
			console.log('🕐 非房主获取到时间戳，启动计时器');
			this.startTimestampBasedTimer();
		}

		// 同步工作台状态
		if (gameState.stations) {
			console.log('🔧 同步工作台状态:', gameState.stations);
			this.updateStationsFromServer(gameState.stations);
		}

		// 同步盘子状态
		if (gameState.plates) {
			console.log('🍽️ 同步盘子状态:', gameState.plates);
			this.updatePlatesFromServer(gameState.plates);
		}

		// 同步洗碗槽状态
		if (gameState.washStations) {
			console.log('🚿 同步洗碗槽状态:', gameState.washStations);
			this.updateWashStationsFromServer(gameState.washStations);
		}

		// 同步地面物品
		if (gameState.groundItems) {
			console.log('📦 同步地面物品:', gameState.groundItems);
			this.updateGroundItemsFromServer(gameState.groundItems);
		}

		// 同步灭火器状态
		if (gameState.extinguisher) {
			console.log('🧯 同步灭火器状态:', gameState.extinguisher);
			this.updateExtinguisherFromServer(gameState.extinguisher);
		}
	}

	// 从服务器更新工作台状态
	updateStationsFromServer(serverStations) {
		// 安全检查：确保stations对象已经初始化
		if (!this.stations || !this.stations.children) {
			console.warn('⚠️ stations对象未初始化，跳过更新:', {
				stationsExists: !!this.stations,
				childrenExists: this.stations ? !!this.stations.children : false,
			});
			return;
		}

		Object.keys(serverStations).forEach((stationId) => {
			const serverStationData = serverStations[stationId];
			console.log('🔧 处理工作台（对象）:', { stationId, serverStationData });

			// 通过位置查找对应的本地工作台
			const localStation = this.findStationByPosition(
				serverStationData.position
			);
			if (localStation) {
				console.log('🔧 找到本地工作台，更新状态:', {
					stationId,
					localPosition: { x: localStation.x, y: localStation.y },
					serverData: serverStationData,
				});

				// 获取更新前的状态
				const wasProcessing = localStation.getData('isProcessing');
				const wasFireCountdown = localStation.getData('fireCountdown');

				// 更新工作台状态
				localStation.setData(
					'isProcessing',
					serverStationData.isProcessing || false
				);
				localStation.setData(
					'processedItem',
					serverStationData.processedItem || null
				);
				localStation.setData(
					'processingItem',
					serverStationData.processingItem || null
				);
				localStation.setData('isOnFire', serverStationData.isOnFire || false);
				localStation.setData('contents', serverStationData.contents || []);
				localStation.setData(
					'currentUser',
					serverStationData.currentUser || null
				);
				localStation.setData(
					'fireCountdown',
					serverStationData.fireCountdown || false
				);
				localStation.setData(
					'fireCountdownStartTime',
					serverStationData.fireCountdownStartTime || null
				);

				// 如果工作台着火，更新纹理
				if (
					serverStationData.isOnFire &&
					serverStationData.stationType === 'cooking'
				) {
					localStation.setTexture('fire_cooking_station');
				} else if (serverStationData.stationType === 'cooking') {
					localStation.setTexture('cooking_station');
				}

				// 更新ID映射
				this.stationIdMap.set(localStation, stationId);

				// 🔥 新增：为其他玩家重建进度条视觉效果
				const isProcessing = serverStationData.isProcessing;
				const isFireCountdown = serverStationData.fireCountdown;
				const startTime = serverStationData.fireCountdownStartTime;
				const currentUser = serverStationData.currentUser;

				// 只有当不是当前玩家操作的工作台时，才重建进度条
				if (currentUser && currentUser !== this.currentPlayerId) {
					// 处理正常进度条（绿色）
					if (isProcessing && !wasProcessing) {
						console.log('🎮 为其他玩家重建正常进度条:', {
							stationId,
							currentUser,
							currentPlayerId: this.currentPlayerId,
							stationType: serverStationData.stationType,
						});

						// 根据工作台类型确定处理时间
						let processTime = 0;
						const stationType = serverStationData.stationType;
						if (stationType === 'cutting') {
							processTime = this.gameConfig.choppingTime;
						} else if (stationType === 'cooking') {
							processTime = this.gameConfig.cookingTime;
						} else if (stationType === 'washing') {
							processTime = this.gameConfig.washTime;
						}

						if (processTime > 0) {
							this.showProcessingEffect(localStation, processTime);
						}
					}

					// 处理着火倒计时进度条（红色）
					if (isFireCountdown && !wasFireCountdown && startTime) {
						console.log('🔥 为其他玩家重建着火倒计时进度条:', {
							stationId,
							currentUser,
							currentPlayerId: this.currentPlayerId,
							startTime,
						});

						// 计算剩余时间
						const elapsed = this.time.now - startTime;
						const remainingTime = Math.max(
							0,
							this.gameConfig.fireCountdownTime - elapsed
						);

						if (remainingTime > 0) {
							this.showFireCountdownEffect(localStation, remainingTime);
						}
					}
				}

				console.log('✅ 工作台状态更新完成:', {
					stationId,
					updatedLocalData: {
						isProcessing: localStation.getData('isProcessing'),
						processedItem: localStation.getData('processedItem'),
						processingItem: localStation.getData('processingItem'),
						contents: localStation.getData('contents'),
						currentUser: localStation.getData('currentUser'),
						fireCountdown: localStation.getData('fireCountdown'),
					},
				});
			} else {
				console.warn('⚠️ 未找到对应的本地工作台:', {
					stationId,
					serverPosition: serverStationData.position,
					availableStations: this.stations.children.entries.map((s) => ({
						x: s.x,
						y: s.y,
						type: s.getData('type'),
					})),
				});
			}
		});
	}

	// 从服务器更新盘子状态
	updatePlatesFromServer(serverPlates) {
		console.log('🍽️ 开始更新盘子状态，服务器数据:', serverPlates);

		// 安全检查：确保plates对象已经初始化
		if (!this.plates || !this.plates.children) {
			console.warn('⚠️ plates对象未初始化，跳过更新:', {
				platesExists: !!this.plates,
				childrenExists: this.plates ? !!this.plates.children : false,
				serverPlatesType: typeof serverPlates,
				serverPlatesLength: Array.isArray(serverPlates)
					? serverPlates.length
					: Object.keys(serverPlates || {}).length,
			});
			return;
		}

		// 检查serverPlates是数组还是对象
		if (Array.isArray(serverPlates)) {
			// 处理数组结构
			serverPlates.forEach((serverPlateData) => {
				console.log('🍽️ 处理盘子（数组）:', { serverPlateData });

				// 通过ID或位置查找对应的本地盘子
				let localPlate = null;

				// 首先尝试通过ID查找
				if (serverPlateData.id) {
					localPlate = this.plates.children.entries.find(
						(plate) => plate.getData('plateId') === serverPlateData.id
					);
				}

				// 如果通过ID没找到，尝试通过位置查找
				if (
					!localPlate &&
					serverPlateData.x !== undefined &&
					serverPlateData.y !== undefined
				) {
					localPlate = this.findPlateByPosition({
						x: serverPlateData.x,
						y: serverPlateData.y,
					});
				}

				if (localPlate) {
					console.log('🍽️ 找到本地盘子，更新状态:', {
						plateId: serverPlateData.id,
						localPosition: { x: localPlate.x, y: localPlate.y },
						serverData: serverPlateData,
						currentLocalData: {
							contents: localPlate.getData('contents'),
							plateType: localPlate.getData('plateType'),
							visible: localPlate.visible,
							active: localPlate.active,
						},
					});

					// 更新盘子状态
					localPlate.setData('contents', serverPlateData.contents || []);
					localPlate.setData('plateType', serverPlateData.plateType || 'clean');

					// 更新位置（如果服务器有位置信息）
					if (
						serverPlateData.x !== undefined &&
						serverPlateData.y !== undefined
					) {
						localPlate.setPosition(serverPlateData.x, serverPlateData.y);
					}

					// 更新可见性和活跃状态
					if (serverPlateData.visible !== undefined) {
						localPlate.setVisible(serverPlateData.visible);
					}
					if (serverPlateData.active !== undefined) {
						// 特殊处理：如果是脏盘子且可见，确保它是活跃的（可以被交互）
						if (
							serverPlateData.plateType === 'dirty' &&
							serverPlateData.visible
						) {
							localPlate.setActive(true); // 脏盘子必须可交互
							console.log('🍽️ 强制设置脏盘子为活跃状态:', {
								plateId: serverPlateData.id,
								plateType: 'dirty',
								visible: serverPlateData.visible,
								forceActive: true,
							});
						} else {
							localPlate.setActive(serverPlateData.active);
						}
					}

					// 根据盘子类型更新纹理
					const plateType = serverPlateData.plateType || 'clean';
					if (plateType === 'dirty') {
						localPlate.setTexture('dirty_plate');
					} else {
						localPlate.setTexture('plate_sprite'); // 🔧 修复：使用正确的纹理
					}

					// 如果服务器有ID，确保本地盘子也有相同的ID
					if (serverPlateData.id) {
						localPlate.setData('plateId', serverPlateData.id);
					}

					console.log('✅ 盘子状态更新完成:', {
						plateId: serverPlateData.id,
						updatedLocalData: {
							contents: localPlate.getData('contents'),
							plateType: localPlate.getData('plateType'),
							position: { x: localPlate.x, y: localPlate.y },
							visible: localPlate.visible,
							active: localPlate.active,
							texture: localPlate.texture.key,
						},
					});
				} else {
					console.warn('⚠️ 未找到对应的本地盘子:', {
						serverPlateData,
						availablePlates: this.plates.children.entries.map((p) => ({
							x: p.x,
							y: p.y,
							plateId: p.getData('plateId'),
							contents: p.getData('contents'),
						})),
					});
				}
			});
		} else {
			// 处理对象结构（保持向后兼容）
			Object.keys(serverPlates).forEach((plateId) => {
				const serverPlateData = serverPlates[plateId];
				console.log('🍽️ 处理盘子（对象）:', { plateId, serverPlateData });

				// 通过位置查找对应的本地盘子
				const localPlate = this.findPlateByPosition(serverPlateData.position);
				if (localPlate) {
					console.log('🍽️ 找到本地盘子，更新状态:', {
						plateId,
						localPosition: { x: localPlate.x, y: localPlate.y },
						serverData: serverPlateData,
					});

					// 更新盘子状态
					localPlate.setData('contents', serverPlateData.contents);
					localPlate.setData('plateType', serverPlateData.plateType);

					// 更新ID映射
					this.plateIdMap.set(localPlate, plateId);
				}
			});
		}
	}

	// 从服务器更新洗碗槽状态
	updateWashStationsFromServer(serverWashStations) {
		// 安全检查：确保washStation对象已经初始化
		if (!this.washStation || !this.washStation.children) {
			console.warn('⚠️ washStation对象未初始化，跳过更新:', {
				washStationExists: !!this.washStation,
				childrenExists: this.washStation ? !!this.washStation.children : false,
			});
			return;
		}

		if (!serverWashStations) {
			console.warn('⚠️ 服务器洗碗槽数据为空，跳过更新');
			return;
		}

		Object.keys(serverWashStations).forEach((washStationId) => {
			const serverWashStationData = serverWashStations[washStationId];

			// 检查服务器数据是否有效
			if (!serverWashStationData) {
				console.warn('⚠️ 洗碗槽数据无效:', {
					washStationId,
					serverWashStationData,
				});
				return;
			}

			// 检查position是否存在
			if (
				!serverWashStationData.position ||
				typeof serverWashStationData.position.x === 'undefined' ||
				typeof serverWashStationData.position.y === 'undefined'
			) {
				console.warn('⚠️ 洗碗槽位置数据无效，跳过查找:', {
					washStationId,
					position: serverWashStationData.position,
				});
				return;
			}

			// 通过位置查找对应的本地洗碗槽
			const localWashStation = this.findWashStationByPosition(
				serverWashStationData.position
			);

			if (localWashStation) {
				console.log('🚿 更新洗碗槽:', {
					washStationId,
					localPosition: { x: localWashStation.x, y: localWashStation.y },
					serverData: serverWashStationData,
				});

				// 获取更新前的状态
				const wasWashing = localWashStation.getData('isWashing');

				// 更新洗碗槽状态
				localWashStation.setData(
					'isWashing',
					serverWashStationData.isWashing || false
				);
				localWashStation.setData(
					'cleanPlate',
					serverWashStationData.cleanPlate || false
				);
				localWashStation.setData(
					'currentUser',
					serverWashStationData.currentUser || null
				);
				localWashStation.setData(
					'startTime',
					serverWashStationData.startTime || null
				);

				// 🔥 新增：为其他玩家重建洗碗台进度条视觉效果
				const isWashing = serverWashStationData.isWashing;
				const currentUser = serverWashStationData.currentUser;
				const startTime = serverWashStationData.startTime;

				// 只有当不是当前玩家操作的洗碗台时，才重建进度条
				if (currentUser && currentUser !== this.currentPlayerId) {
					// 处理清洗进度条
					if (isWashing && !wasWashing && startTime) {
						console.log('🚿 为其他玩家重建洗碗台进度条:', {
							washStationId,
							currentUser,
							currentPlayerId: this.currentPlayerId,
							startTime,
						});

						// 计算剩余时间
						const elapsed = this.time.now - startTime;
						const remainingTime = Math.max(
							0,
							this.gameConfig.washTime - elapsed
						);

						if (remainingTime > 0) {
							this.showProcessingEffect(localWashStation, remainingTime);
						}
					}
				}

				// 更新ID映射
				this.washStationIdMap.set(localWashStation, washStationId);

				console.log('✅ 洗碗槽状态更新完成:', {
					washStationId,
					updatedLocalData: {
						isWashing: localWashStation.getData('isWashing'),
						cleanPlate: localWashStation.getData('cleanPlate'),
						currentUser: localWashStation.getData('currentUser'),
						startTime: localWashStation.getData('startTime'),
					},
				});
			} else {
				console.warn('⚠️ 未找到对应的本地洗碗槽:', {
					washStationId,
					serverPosition: serverWashStationData.position,
					availableWashStations:
						this.washStation?.children?.entries?.map((ws) => ({
							x: ws.x,
							y: ws.y,
							type: ws.getData('type'),
						})) || [],
				});
			}
		});
	}

	// 从服务器更新地面物品状态
	updateGroundItemsFromServer(serverGroundItems) {
		// 安全检查：确保groundItems对象已经初始化
		if (!this.groundItems || !this.groundItems.children) {
			console.warn('⚠️ groundItems对象未初始化，跳过更新:', {
				groundItemsExists: !!this.groundItems,
				childrenExists: this.groundItems ? !!this.groundItems.children : false,
			});
			return;
		}

		if (!serverGroundItems) {
			console.warn('⚠️ 服务器地面物品数据为空，跳过更新');
			return;
		}

		// 清除所有现有的地面物品
		this.groundItems.children.entries.forEach((item) => {
			this.groundItemIdMap.delete(item);
			item.destroy();
		});

		// 根据服务器数据重新创建地面物品
		serverGroundItems.forEach((itemData) => {
			console.log('📦 创建地面物品:', itemData);

			const groundItem = this.groundItems.create(
				itemData.position.x,
				itemData.position.y,
				itemData.type
			);
			groundItem.setData('type', itemData.type);
			groundItem.setData('contents', itemData.contents);

			// 根据物品类型设置不同的尺寸
			if (itemData.type.includes('plate')) {
				groundItem.setSize(40, 40); // 盘子类型物品
				groundItem.setScale(1.3);
			} else {
				groundItem.setSize(28, 28); // 普通物品
			}

			// 更新ID映射
			this.groundItemIdMap.set(groundItem, itemData.id);
		});
	}

	// 从服务器更新灭火器状态
	updateExtinguisherFromServer(serverExtinguisher) {
		// 安全检查：确保extinguisher对象已经初始化
		if (!this.extinguisher || !this.extinguisher.children) {
			console.warn('⚠️ extinguisher对象未初始化，跳过更新:', {
				extinguisherExists: !!this.extinguisher,
				childrenExists: this.extinguisher
					? !!this.extinguisher.children
					: false,
			});
			return;
		}

		if (!serverExtinguisher) {
			console.warn('⚠️ 服务器灭火器数据为空，跳过更新');
			return;
		}

		// 获取本地灭火器对象（应该只有一个）
		const localExtinguisher = this.extinguisher.children.entries[0];
		if (!localExtinguisher) {
			console.warn('⚠️ 本地灭火器对象不存在');
			return;
		}

		console.log('🧯 更新本地灭火器状态:', {
			serverState: serverExtinguisher,
			currentPosition: { x: localExtinguisher.x, y: localExtinguisher.y },
			currentVisible: localExtinguisher.visible,
			currentActive: localExtinguisher.active,
		});

		// 更新灭火器位置
		if (serverExtinguisher.position) {
			localExtinguisher.setPosition(
				serverExtinguisher.position.x,
				serverExtinguisher.position.y
			);
		}

		// 更新可见性和活跃状态
		if (serverExtinguisher.visible !== undefined) {
			localExtinguisher.setVisible(serverExtinguisher.visible);
		}
		if (serverExtinguisher.active !== undefined) {
			localExtinguisher.setActive(serverExtinguisher.active);
		}

		// 强制更新物理体位置（确保碰撞检测正确）
		if (localExtinguisher.body) {
			localExtinguisher.body.updateFromGameObject();
		}

		console.log('✅ 灭火器状态更新完成:', {
			newPosition: { x: localExtinguisher.x, y: localExtinguisher.y },
			visible: localExtinguisher.visible,
			active: localExtinguisher.active,
			isHeld: serverExtinguisher.isHeld,
			heldBy: serverExtinguisher.heldBy,
		});
	}

	// 通过位置查找工作台
	findStationByPosition(position) {
		// 参数验证
		if (
			!position ||
			typeof position.x !== 'number' ||
			typeof position.y !== 'number'
		) {
			console.warn('⚠️ findStationByPosition: 无效的position参数:', position);
			return null;
		}

		return this.stations.children.entries.find((station) => {
			const distance = Phaser.Math.Distance.Between(
				station.x,
				station.y,
				position.x,
				position.y
			);
			return distance < 10; // 允许10像素的误差
		});
	}

	// 通过位置查找盘子
	findPlateByPosition(position) {
		// 参数验证
		if (
			!position ||
			typeof position.x !== 'number' ||
			typeof position.y !== 'number'
		) {
			console.warn('⚠️ findPlateByPosition: 无效的position参数:', position);
			return null;
		}

		return this.plates.children.entries.find((plate) => {
			const distance = Phaser.Math.Distance.Between(
				plate.x,
				plate.y,
				position.x,
				position.y
			);
			return distance < 10; // 允许10像素的误差
		});
	}

	// 通过位置查找洗碗槽
	findWashStationByPosition(position) {
		// 参数验证
		if (
			!position ||
			typeof position.x !== 'number' ||
			typeof position.y !== 'number'
		) {
			console.warn(
				'⚠️ findWashStationByPosition: 无效的position参数:',
				position
			);
			return null;
		}

		return this.washStation.children.entries.find((washStation) => {
			const distance = Phaser.Math.Distance.Between(
				washStation.x,
				washStation.y,
				position.x,
				position.y
			);
			return distance < 10; // 允许10像素的误差
		});
	}

	// 生成唯一ID
	generateObjectId() {
		return `obj_${this.objectIdCounter++}_${Date.now()}`;
	}

	// 获取或创建盘子ID
	getPlateId(plate) {
		// 优先使用盘子自身的plateId
		const existingId = plate.getData('plateId');
		if (existingId) {
			return existingId;
		}

		// 如果没有，检查映射表
		if (!this.plateIdMap.has(plate)) {
			this.plateIdMap.set(plate, this.generateObjectId());
		}
		return this.plateIdMap.get(plate);
	}

	// 获取或创建工作台ID
	getStationId(station) {
		if (!this.stationIdMap.has(station)) {
			this.stationIdMap.set(station, this.generateObjectId());
		}
		return this.stationIdMap.get(station);
	}

	// 获取或创建洗碗槽ID
	getWashStationId(washStation) {
		if (!this.washStationIdMap.has(washStation)) {
			this.washStationIdMap.set(washStation, this.generateObjectId());
		}
		return this.washStationIdMap.get(washStation);
	}

	// 获取或创建地面物品ID
	getGroundItemId(groundItem) {
		if (!this.groundItemIdMap.has(groundItem)) {
			this.groundItemIdMap.set(groundItem, this.generateObjectId());
		}
		return this.groundItemIdMap.get(groundItem);
	}

	// 同步盘子状态
	async syncPlateState(plate) {
		if (this.gameMode !== 'multiplayer') return;

		const plateId = this.getPlateId(plate);
		const contents = plate.getData('contents') || [];
		const plateType = plate.getData('plateType') || 'clean';
		const position = { x: plate.x, y: plate.y };
		const visible = plate.visible;
		const active = plate.active;

		try {
			await multiplayerManager.syncPlateState(
				plateId,
				contents,
				plateType,
				position,
				visible,
				active
			);
			console.log('✅ 盘子状态同步成功:', {
				plateId,
				contents,
				plateType,
				position,
				visible,
				active,
			});
		} catch (error) {
			console.error('❌ 盘子状态同步失败:', error);
		}
	}

	// 同步工作台状态
	async syncStationState(station) {
		if (this.gameMode !== 'multiplayer') return;

		const stationId = this.getStationId(station);
		const isProcessing = station.getData('isProcessing') || false;
		const processedItem = station.getData('processedItem') || null;
		const processingItem = station.getData('processingItem') || null;
		const isOnFire = station.getData('isOnFire') || false;
		const contents = station.getData('contents') || [];
		const fireCountdown = station.getData('fireCountdown') || false;
		const fireCountdownStartTime =
			station.getData('fireCountdownStartTime') || null;

		const stationData = {
			isProcessing: isProcessing,
			processedItem: processedItem,
			processingItem: processingItem,
			isOnFire: isOnFire,
			position: { x: station.x, y: station.y },
			stationType: station.getData('type'),
			contents: contents, // 确保包含contents
			fireCountdown: fireCountdown, // 新增：着火倒计时状态
			fireCountdownStartTime: fireCountdownStartTime, // 新增：着火倒计时开始时间
			currentUser: isProcessing ? this.currentPlayerId : null, // 新增：当前使用工作台的玩家ID
		};

		try {
			const result = await multiplayerManager.syncStationState(
				stationId,
				stationData
			);
			console.log('✅ 工作台状态同步成功:', {
				stationId,
				stationData,
				result: result?.result,
			});
		} catch (error) {
			console.error('❌ 工作台状态同步失败:', error);
		}
	}

	// 同步洗碗槽状态
	async syncWashStationState(washStation) {
		if (this.gameMode !== 'multiplayer') return;

		const washStationId = this.getWashStationId(washStation);
		const isWashing = washStation.getData('isWashing') || false;
		const startTime = washStation.getData('startTime') || null;

		const washStationData = {
			isWashing: isWashing,
			cleanPlate: washStation.getData('cleanPlate') || false,
			position: { x: washStation.x, y: washStation.y },
			currentUser: isWashing ? this.currentPlayerId : null, // 新增：当前使用洗碗台的玩家ID
			startTime: startTime, // 新增：开始清洗的时间
		};

		try {
			await multiplayerManager.syncWashStationState(
				washStationId,
				washStationData
			);
			console.log('✅ 洗碗槽状态同步成功:', { washStationId, washStationData });
		} catch (error) {
			console.error('❌ 洗碗槽状态同步失败:', error);
		}
	}

	// 同步地面物品添加
	async syncGroundItemAdd(groundItem) {
		if (this.gameMode !== 'multiplayer') return;

		const itemId = this.getGroundItemId(groundItem);
		const itemData = {
			itemId,
			itemType: groundItem.getData('type'),
			contents: groundItem.getData('contents') || null,
			position: { x: groundItem.x, y: groundItem.y },
		};

		try {
			await multiplayerManager.syncGroundItem('add', itemData);
			console.log('✅ 地面物品添加同步成功:', itemData);
		} catch (error) {
			console.error('❌ 地面物品添加同步失败:', error);
		}
	}

	// 同步地面物品移除
	async syncGroundItemRemove(groundItem) {
		if (this.gameMode !== 'multiplayer') return;

		const itemId = this.getGroundItemId(groundItem);

		try {
			await multiplayerManager.syncGroundItem('remove', { itemId });
			console.log('✅ 地面物品移除同步成功:', { itemId });
			// 清理映射
			this.groundItemIdMap.delete(groundItem);
		} catch (error) {
			console.error('❌ 地面物品移除同步失败:', error);
		}
	}

	// 同步灭火器状态
	async syncExtinguisherState(position, isHeld, visible = true, active = true) {
		if (this.gameMode !== 'multiplayer') return;

		const extinguisherData = {
			position: position,
			isHeld: isHeld,
			visible: visible,
			active: active,
		};

		try {
			const result = await multiplayerManager.syncPlayerAction(
				'extinguisherUpdate',
				extinguisherData
			);
			console.log('✅ 灭火器状态同步成功:', {
				extinguisherData,
				result: result?.result,
			});
		} catch (error) {
			console.error('❌ 灭火器状态同步失败:', error);
		}
	}

	async startGame() {
		if (this.gameStarted) return;

		this.gameStarted = true;
		this.gameEnded = false;

		// 🏆 记录游戏开始时间，用于计算游戏时长
		this.gameStartTime = Date.now();

		// 播放背景音乐
		if (!this.bgmSound) {
			this.bgmSound = this.sound.add('bgm', {
				volume: 0.3, // 设置音量为30%
				loop: true, // 循环播放
			});
		}

		// 开始播放BGM
		if (this.bgmSound && !this.bgmSound.isPlaying) {
			this.bgmSound.play();
			console.log('🎵 开始播放背景音乐');
		}

		if (this.gameMode === 'multiplayer') {
			// 多人游戏模式：使用服务器时间戳同步
			console.log('🎮 多人模式：启动基于服务器时间戳的时间同步');

			try {
				// 1. 获取服务器时间偏移
				await this.syncServerTime();

				// 2. 如果是房主，启动游戏并设置服务器时间戳
				if (multiplayerManager.isHost) {
					const startResult = await multiplayerManager.startMultiplayerGame(
						this.currentRoomId,
						this.gameDuration
					);

					if (startResult.success) {
						this.gameStartTime = startResult.gameStartTime;
						this.gameEndTime = startResult.gameEndTime;
						this.gameDuration = startResult.gameDuration;
						console.log('🎮 房主设置游戏时间戳:', {
							gameStartTime: this.gameStartTime,
							gameEndTime: this.gameEndTime,
							gameDuration: this.gameDuration,
						});
					} else {
						console.error('❌ 房主启动游戏失败:', startResult.error);
						// 降级到本地时间
						this.gameStartTime = Date.now();
						this.gameEndTime = this.gameStartTime + this.gameDuration;
					}
				} else {
					// 非房主等待从服务器获取游戏时间戳
					console.log('🎮 非房主等待服务器时间戳...');
					// 时间戳会通过 updateGameStateFromServer 获取
				}

				// 3. 启动定期时间同步
				this.startTimeSync();

				// 4. 启动基于时间戳的计时器
				this.startTimestampBasedTimer();
			} catch (error) {
				console.error('❌ 多人模式时间同步初始化失败:', error);
				// 降级到本地时间
				this.gameStartTime = Date.now();
				this.gameEndTime = this.gameStartTime + this.gameDuration;
				this.startTimer();
			}

			// 多人游戏：从服务器获取游戏状态
			const gameState = await multiplayerManager.getGameStateFromServer(
				this.currentRoomId
			);
			if (gameState && gameState.success) {
				this.updateGameStateFromServer(gameState.gameState);
			}

			// 启动多人同步
			this.startMultiplayerSync();
		} else {
			// 单人游戏模式：使用本地时间
			this.startTimer();
		}

		// 生成初始订单
		this.generateOrder();

		// 启动订单计时器
		this.startOrderTimer();

		console.log('🎮 游戏开始:', {
			gameMode: this.gameMode,
			gameStartTime: this.gameStartTime,
			gameEndTime: this.gameEndTime,
			gameDuration: this.gameDuration,
		});
	}

	createKitchenLayout() {
		// 创建地板
		for (let x = 0; x < 800; x += 64) {
			for (let y = 0; y < 600; y += 64) {
				this.add.image(x + 32, y + 32, 'floor_tile').setDepth(-2);
			}
		}

		// 创建墙壁装饰
		for (let x = 0; x < 800; x += 64) {
			this.add.image(x + 32, 32, 'wall_tile').setDepth(-1);
			this.add.image(x + 32, 568, 'wall_tile').setDepth(-1);
		}
		for (let y = 64; y < 536; y += 64) {
			this.add.image(32, y + 32, 'wall_tile').setDepth(-1);
			this.add.image(768, y + 32, 'wall_tile').setDepth(-1);
		}
	}

	setupControls() {
		this.cursors = this.input.keyboard.createCursorKeys();
		this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
		this.spaceKey = this.input.keyboard.addKey(
			Phaser.Input.Keyboard.KeyCodes.SPACE
		);
		this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
		this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
	}

	createGameObjects() {
		// 先创建墙壁组，确保createKitchenLayout中的createBoundaryWalls可以使用
		this.walls = this.physics.add.staticGroup();

		// 创建食材组
		this.ingredients = this.physics.add.staticGroup();
		this.createIngredients();

		// 创建工作台组
		this.stations = this.physics.add.staticGroup();
		this.createStations();

		// 创建盘子组
		this.plates = this.physics.add.staticGroup();
		this.createPlates();

		// 创建地面物品组
		this.groundItems = this.physics.add.staticGroup();

		// 创建洗碗槽
		this.washStation = this.physics.add.staticGroup();
		this.washStation
			.create(200, 420, 'wash_station')
			.setSize(60, 60)
			.setData('type', 'wash')
			.setData('isWashing', false);

		// 创建垃圾桶 - 调大尺寸
		this.trash = this.physics.add.staticGroup();
		this.trash.create(700, 500, 'trash').setSize(48, 48).setScale(1.5);

		// 创建灭火器 - 调大尺寸
		this.extinguisher = this.physics.add.staticGroup();
		this.extinguisher
			.create(650, 350, 'extinguisher')
			.setSize(48, 48)
			.setScale(1.5);

		// 创建内部墙壁障碍物
		this.createWallObstacles();

		// 创建边界墙壁碰撞体
		this.createBoundaryWalls();

		console.log('🧯 创建灭火器:', {
			position: { x: 650, y: 350 },
			count: 1,
			scale: 1.5,
		});
	}

	createIngredients() {
		// 食材储存区
		const ingredientPositions = [
			{ x: 150, y: 120, type: 'tomato' },
			{ x: 200, y: 120, type: 'tomato' },
			{ x: 250, y: 120, type: 'lettuce' },
			{ x: 300, y: 120, type: 'lettuce' },
			{ x: 350, y: 120, type: 'bread' },
			{ x: 400, y: 120, type: 'bread' },
			// 第二排
			{ x: 150, y: 170, type: 'tomato' },
			{ x: 200, y: 170, type: 'tomato' },
			{ x: 250, y: 170, type: 'lettuce' },
			{ x: 300, y: 170, type: 'lettuce' },
			{ x: 350, y: 170, type: 'bread' },
			{ x: 400, y: 170, type: 'bread' },
		];

		ingredientPositions.forEach((pos) => {
			const ingredient = this.ingredients.create(pos.x, pos.y, pos.type);
			ingredient.setData('type', pos.type);
			ingredient.setData('originalType', pos.type);
			ingredient.setSize(28, 28);
		});
	}

	createStations() {
		// 工作台布局 - 调整位置为洗碗槽让路
		const stationData = [
			{
				x: 200,
				y: 280,
				type: 'cutting',
				id: 'cutting',
				texture: 'cutting_station',
			},
			{
				x: 350,
				y: 280,
				type: 'cooking',
				id: 'cooking',
				texture: 'cooking_station',
			},
			{
				x: 500,
				y: 280,
				type: 'serving',
				id: 'serving',
				texture: 'serving_station',
			}, // 改为出餐口
		];

		stationData.forEach((data) => {
			const station = this.stations.create(data.x, data.y, data.texture);
			station.setData('type', data.type);
			station.setData('id', data.id); // 添加ID数据
			station.setData('isProcessing', false);
			station.setData('contents', []);
			station.setSize(60, 60);
		});
	}

	createPlates() {
		// 清空盘子池
		this.platePool = [];

		// 盘子区域 - 固定4个位置
		const platePositions = [
			{ x: 350, y: 420 },
			{ x: 400, y: 420 },
			{ x: 450, y: 420 },
			{ x: 500, y: 420 },
		];

		platePositions.forEach((pos, index) => {
			const plate = this.plates.create(pos.x, pos.y, 'plate_sprite');
			plate.setData('contents', []);
			plate.setData('plateType', 'clean'); // 设置为干净盘子
			plate.setData('originalPosition', { x: pos.x, y: pos.y }); // 记录原始位置
			plate.setSize(40, 40); // 调大盘子碰撞尺寸
			plate.setScale(1.3); // 调大盘子显示尺寸

			// 为每个盘子分配唯一且固定的ID
			const plateId = `plate_${index}`;
			plate.setData('plateId', plateId);

			// 加入盘子池
			this.platePool.push(plate);

			console.log('🍽️ 创建盘子:', {
				plateId,
				position: pos,
				plateType: 'clean',
				poolSize: this.platePool.length,
				scale: 1.3,
			});

			// 在多人游戏模式下，初始化盘子状态到服务器
			if (this.gameMode === 'multiplayer') {
				// 延迟同步，确保游戏完全初始化后再同步
				this.time.delayedCall(1000, () => {
					this.syncPlateState(plate);
				});
			}
		});

		console.log('🍽️ 盘子池初始化完成:', {
			totalPlates: this.platePool.length,
			maxPlates: this.maxPlates,
		});
	}

	createWallObstacles() {
		// 根据用户指定位置添加墙壁障碍物
		const wallPositions = [
			// 左下角洗碗槽附近的水平墙壁
			{ x: 80, y: 350, width: 200, height: 20 }, // 水平墙壁

			// 中下部盘子区域附近的垂直墙壁
			{ x: 260, y: 450, width: 20, height: 80 }, // 垂直墙壁
		];

		wallPositions.forEach((wallConfig, index) => {
			// 创建墙壁图形
			const wall = this.walls.create(
				wallConfig.x + wallConfig.width / 2, // 中心点X
				wallConfig.y + wallConfig.height / 2, // 中心点Y
				'wall_tile' // 使用墙壁纹理
			);

			// 设置墙壁尺寸和碰撞体
			wall.setSize(wallConfig.width, wallConfig.height);
			wall.setDisplaySize(wallConfig.width, wallConfig.height);
			wall.setData('type', 'wall');
			wall.setData('id', `wall_${index}`);
			wall.setDepth(1); // 设置墙壁在地板之上，但在其他对象之下

			console.log('🧱 创建墙壁障碍物:', {
				id: `wall_${index}`,
				position: {
					x: wallConfig.x + wallConfig.width / 2,
					y: wallConfig.y + wallConfig.height / 2,
				},
				size: { width: wallConfig.width, height: wallConfig.height },
			});
		});

		console.log('🧱 墙壁障碍物创建完成:', {
			totalWalls: wallPositions.length,
		});
	}

	createBoundaryWalls() {
		// 创建四周边界墙壁的碰撞体
		const boundaryWalls = [
			// 上边界
			{ x: 400, y: 32, width: 800, height: 64 },
			// 下边界
			{ x: 400, y: 568, width: 800, height: 64 },
			// 左边界
			{ x: 32, y: 300, width: 64, height: 600 },
			// 右边界
			{ x: 768, y: 300, width: 64, height: 600 },
		];

		boundaryWalls.forEach((boundaryConfig, index) => {
			// 创建不可见的边界墙壁碰撞体
			const boundaryWall = this.walls.create(
				boundaryConfig.x, // 中心点X
				boundaryConfig.y, // 中心点Y
				null // 不使用纹理，创建不可见碰撞体
			);

			// 设置边界墙壁尺寸和碰撞体
			boundaryWall.setSize(boundaryConfig.width, boundaryConfig.height);
			boundaryWall.setData('type', 'boundary_wall');
			boundaryWall.setData('id', `boundary_${index}`);
			boundaryWall.setVisible(false); // 设置为不可见，只用于碰撞检测
			boundaryWall.setDepth(-10); // 设置较低的深度

			console.log('🧱 创建边界墙壁:', {
				id: `boundary_${index}`,
				position: { x: boundaryConfig.x, y: boundaryConfig.y },
				size: { width: boundaryConfig.width, height: boundaryConfig.height },
			});
		});

		console.log('🧱 边界墙壁创建完成:', {
			totalBoundaryWalls: boundaryWalls.length,
		});
	}

	setupCollisions() {
		// 设置玩家与墙壁的碰撞
		this.physics.add.collider(this.player, this.walls);

		// 设置其他玩家与墙壁的碰撞（多人游戏）
		if (this.gameMode === 'multiplayer') {
			this.otherPlayers.forEach((otherPlayerData) => {
				if (otherPlayerData.sprite) {
					this.physics.add.collider(otherPlayerData.sprite, this.walls);
				}
			});
		}

		// 设置重叠检测
		this.physics.add.overlap(
			this.player,
			this.ingredients,
			this.handleIngredientInteraction,
			null,
			this
		);
		this.physics.add.overlap(
			this.player,
			this.stations,
			this.handleStationInteraction,
			null,
			this
		);
		this.physics.add.overlap(
			this.player,
			this.plates,
			this.handlePlateInteraction,
			null,
			this
		);
		this.physics.add.overlap(
			this.player,
			this.washStation,
			this.handleWashStationInteraction,
			null,
			this
		);
		this.physics.add.overlap(
			this.player,
			this.trash,
			this.handleTrashInteraction,
			null,
			this
		);
		this.physics.add.overlap(
			this.player,
			this.groundItems,
			this.handleGroundItemInteraction,
			null,
			this
		);
		this.physics.add.overlap(
			this.player,
			this.extinguisher,
			this.handleExtinguisherInteraction,
			null,
			this
		);
	}

	setupParticleEffects() {
		// 创建粒子效果
		this.cookingParticles = this.add.particles(0, 0, 'particle', {
			scale: { start: 0.5, end: 0 },
			speed: { min: 20, max: 40 },
			lifespan: 1000,
			quantity: 2,
			emitting: false,
		});
	}

	createUI() {
		// 创建UI背景 - 只保留底部操作提示区域
		const uiBackground = this.add.graphics();
		uiBackground.fillStyle(0x000000, 0.7);
		uiBackground.fillRect(0, 520, 800, 80); // 底部
		uiBackground.setDepth(100);

		// 操作提示
		this.controlsText = this.add
			.text(
				10,
				550,
				'WASD: 移动 | 空格: 拾取/放下/取回/出餐 | E: 使用工作台/拿起盘子/洗碗 | Q: 放置到地面',
				{
					fontSize: '14px',
					fill: '#FFFFFF',
					fontFamily: 'Arial',
					stroke: '#000000',
					strokeThickness: 2,
				}
			)
			.setDepth(100);
	}

	generateOrder() {
		if (this.gameEnded) return;

		const recipeKeys = Object.keys(this.recipes);
		const randomRecipe =
			recipeKeys[Math.floor(Math.random() * recipeKeys.length)];
		this.currentOrder = {
			...this.recipes[randomRecipe],
			id: randomRecipe,
			timeRemaining: this.recipes[randomRecipe].time,
		};

		// 开始订单倒计时
		this.startOrderTimer();

		// 发送游戏状态更新事件
		this.emitGameStateUpdate();
	}

	getRecipeSteps(recipeId) {
		const steps = {
			simple_salad:
				'1.拿取生菜 → 2.切菜台切菜 → 3.装盘 → 4.拿起盘子 → 5.送到出餐口',
			tomato_salad:
				'1.拿取番茄和生菜 → 2.分别在切菜台切菜 → 3.装盘 → 4.拿起盘子 → 5.送到出餐口',
			sandwich:
				'1.拿取番茄切菜并烹饪 → 2.拿取生菜切菜 → 3.拿取面包 → 4.装盘 → 5.拿起盘子 → 6.送到出餐口',
			cooked_meal:
				'1.拿取番茄切菜并烹饪 → 2.拿取生菜切菜并烹饪 → 3.拿取面包 → 4.装盘 → 5.拿起盘子 → 6.送到出餐口',
		};
		return steps[recipeId];
	}

	startOrderTimer() {
		if (this.orderTimer) {
			this.orderTimer.remove();
		}

		this.orderTimer = this.time.addEvent({
			delay: 1000,
			callback: () => {
				if (this.gameEnded) return;

				this.currentOrder.timeRemaining--;

				// 发送游戏状态更新事件
				this.emitGameStateUpdate();

				if (this.currentOrder.timeRemaining <= 0) {
					this.showMessage('订单超时！', 0xff6b6b);
					this.generateOrder();
				}
			},
			loop: true,
		});
	}

	startTimer() {
		this.gameTimer = this.time.addEvent({
			delay: 1000,
			callback: this.updateTimer,
			callbackScope: this,
			loop: true,
		});
	}

	updateTimer() {
		if (this.gameEnded) return;

		this.timeLeft--;

		// 发送游戏状态更新事件
		this.emitGameStateUpdate();

		if (this.timeLeft <= 0) {
			this.gameOver();
		}
	}

	// 游戏结束处理
	gameOver() {
		if (this.gameEnded) return;

		this.gameEnded = true;

		// 停止背景音乐
		if (this.bgmSound && this.bgmSound.isPlaying) {
			this.bgmSound.stop();
			console.log('🎵 停止背景音乐');
		}

		// 停止计时器
		if (this.gameTimer) {
			this.gameTimer.remove();
			this.gameTimer = null;
		}

		// 停止订单计时器
		if (this.orderTimer) {
			this.orderTimer.remove();
			this.orderTimer = null;
		}

		// 显示游戏结束信息
		const finalScore = this.score;
		const completedOrders = this.completedOrders;

		// 创建游戏结束弹窗
		this.showGameOverModal(finalScore, completedOrders);

		// 多人游戏：通知服务器游戏结束
		if (this.gameMode === 'multiplayer') {
			this.endMultiplayerGame(finalScore);
		}

		console.log('🎮 游戏结束:', {
			finalScore,
			completedOrders,
			gameMode: this.gameMode,
		});
	}

	// 显示游戏结束弹窗
	showGameOverModal(finalScore, completedOrders) {
		// 🏆 更新排行榜数据
		this.updateLeaderboard(finalScore, completedOrders);

		// 创建半透明背景
		const overlay = this.add.graphics();
		overlay.fillStyle(0x000000, 0.7);
		overlay.fillRect(0, 0, 800, 600);
		overlay.setDepth(100);

		// 创建弹窗背景
		const modalBg = this.add.graphics();
		modalBg.fillStyle(0x2c3e50);
		modalBg.lineStyle(4, 0x3498db);
		modalBg.fillRoundedRect(200, 150, 400, 300, 10);
		modalBg.strokeRoundedRect(200, 150, 400, 300, 10);
		modalBg.setDepth(101);

		// 游戏结束标题
		const titleText = this.add.text(400, 200, '🎮 游戏结束！', {
			fontSize: '32px',
			fontFamily: 'Arial',
			color: '#e74c3c',
			align: 'center',
		});
		titleText.setOrigin(0.5);
		titleText.setDepth(102);

		// 最终得分
		const scoreText = this.add.text(400, 260, `最终得分: ${finalScore}`, {
			fontSize: '24px',
			fontFamily: 'Arial',
			color: '#f39c12',
			align: 'center',
		});
		scoreText.setOrigin(0.5);
		scoreText.setDepth(102);

		// 完成订单数
		const ordersText = this.add.text(
			400,
			300,
			`完成订单: ${completedOrders} 单`,
			{
				fontSize: '20px',
				fontFamily: 'Arial',
				color: '#2ecc71',
				align: 'center',
			}
		);
		ordersText.setOrigin(0.5);
		ordersText.setDepth(102);

		// 评价等级
		let gradeText = '';
		let gradeColor = '#95a5a6';
		if (finalScore >= 100) {
			gradeText = '🏆 厨神级别！';
			gradeColor = '#f1c40f';
		} else if (finalScore >= 70) {
			gradeText = '⭐ 优秀厨师！';
			gradeColor = '#e67e22';
		} else if (finalScore >= 40) {
			gradeText = '👨‍🍳 合格厨师';
			gradeColor = '#3498db';
		} else {
			gradeText = '🥄 新手厨师';
			gradeColor = '#95a5a6';
		}

		const gradeDisplay = this.add.text(400, 340, gradeText, {
			fontSize: '18px',
			fontFamily: 'Arial',
			color: gradeColor,
			align: 'center',
		});
		gradeDisplay.setOrigin(0.5);
		gradeDisplay.setDepth(102);

		// 返回按钮
		const returnButton = this.add.text(400, 390, '返回菜单', {
			fontSize: '20px',
			fontFamily: 'Arial',
			color: '#ecf0f1',
			backgroundColor: '#34495e',
			padding: { x: 20, y: 10 },
			align: 'center',
		});
		returnButton.setOrigin(0.5);
		returnButton.setDepth(102);
		returnButton.setInteractive({ useHandCursor: true });

		// 按钮点击事件 - 通过自定义事件通知React组件进行路由导航
		returnButton.on('pointerdown', () => {
			// 发送自定义事件给React组件，让其处理路由导航
			const returnToMenuEvent = new CustomEvent('returnToMenu', {
				detail: { gameMode: this.gameMode },
			});
			window.dispatchEvent(returnToMenuEvent);
		});

		// 按钮悬停效果
		returnButton.on('pointerover', () => {
			returnButton.setStyle({ backgroundColor: '#2c3e50' });
		});

		returnButton.on('pointerout', () => {
			returnButton.setStyle({ backgroundColor: '#34495e' });
		});
	}

	// 🏆 更新排行榜数据
	async updateLeaderboard(finalScore, completedOrders) {
		// 检查场景是否还有效
		if (!this.scene || this.scene.isDestroyed || !this.scene.isActive()) {
			console.warn('⚠️ 场景已销毁，跳过排行榜更新');
			return;
		}

		console.log('🔍 开始更新排行榜数据...', {
			finalScore,
			completedOrders,
			gameMode: this.gameMode,
			gameStartTime: this.gameStartTime,
		});

		try {
			// 导入云开发SDK
			console.log('📦 导入云开发SDK...');
			const cloudbase = await import('../utils/cloudbase.js');
			console.log('✅ 云开发SDK导入成功');

			// 确保用户已登录
			console.log('🔐 确保用户已登录...');
			await cloudbase.default.ensureLogin();
			console.log('✅ 用户登录验证成功');

			// 计算游戏时间（秒）
			const gameTime = this.gameStartTime
				? Math.floor((Date.now() - this.gameStartTime) / 1000)
				: 0;

			// 确定游戏模式
			const mode = this.gameMode === 'multiplayer' ? 'multiplayer' : 'single';

			const requestData = {
				mode: mode,
				score: finalScore,
				completedOrders: completedOrders,
				gameTime: gameTime,
				nickname: null, // 可以后续添加昵称设置功能
			};

			console.log('📤 准备调用云函数updateGameScore，参数:', requestData);

			// 调用云函数更新分数
			const result = await cloudbase.default.callFunction({
				name: 'updateGameScore',
				data: requestData,
			});

			console.log('📥 云函数调用结果:', result);

			if (result.result.success) {
				console.log('🏆 排行榜更新成功:', result.result.data);

				// 可以在这里显示积分获得提示
				const pointsEarned = result.result.data.pointsEarned;
				const newRank = result.result.data.newRank;

				// 显示积分获得消息
				this.showMessage(
					`获得 ${pointsEarned} 积分！当前排名: #${newRank}`,
					0x2ed573
				);
			} else {
				console.error('❌ 排行榜更新失败:', result.result.message);
			}
		} catch (error) {
			console.error('💥 更新排行榜时出错:', error);
			console.error('错误详情:', {
				message: error.message,
				stack: error.stack,
				name: error.name,
			});
			// 不影响游戏结束流程，只记录错误
		}
	}

	// 结束多人游戏
	async endMultiplayerGame(finalScore) {
		try {
			const result = await multiplayerManager.endGame(finalScore);
			console.log('✅ 多人游戏结束通知成功:', result);
		} catch (error) {
			console.error('❌ 多人游戏结束通知失败:', error);
		}
	}

	update() {
		if (this.gameEnded) return;

		this.handlePlayerMovement();
		this.updateUI();
		this.handleInteractionHighlight();
		this.updateVisualFeedback();
		this.handleGroundPlacement(); // 添加地面放置处理
	}

	updateVisualFeedback() {
		// 更新角色手持物品显示
		this.updatePlayerHoldingSprite();

		// 更新盘子内容显示
		this.updatePlateContentsSprites();

		// 更新工作台状态显示
		this.updateStationContentsSprites();
	}

	updatePlayerHoldingSprite() {
		// 清除之前的手持物品显示
		if (this.playerHoldingSprite) {
			this.playerHoldingSprite.destroy();
			this.playerHoldingSprite = null;
		}

		// 如果玩家手持物品，在角色旁边显示
		if (this.playerHolding) {
			// 🔧 修复：确保使用正确的纹理名称
			let textureKey = this.playerHolding.type;
			if (textureKey === 'plate') {
				textureKey = 'plate_sprite'; // 使用plate_sprite纹理而不是不存在的plate纹理
			}

			this.playerHoldingSprite = this.add.sprite(
				this.player.x + 20,
				this.player.y - 10,
				textureKey
			);
			this.playerHoldingSprite.setScale(0.6);
			this.playerHoldingSprite.setDepth(15);

			// 添加轻微的浮动动画
			this.tweens.add({
				targets: this.playerHoldingSprite,
				y: this.player.y - 15,
				duration: 1000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			});
		}
	}

	updatePlateContentsSprites() {
		// 清除之前的盘子内容显示
		this.plateContentsSprites.forEach((sprite) => sprite.destroy());
		this.plateContentsSprites = [];

		// 为每个盘子显示内容
		this.plates.children.entries.forEach((plate) => {
			const contents = plate.getData('contents') || [];
			contents.forEach((itemType, index) => {
				const sprite = this.add.sprite(
					plate.x + index * 8 - 12,
					plate.y - 8,
					itemType
				);
				sprite.setScale(0.4);
				sprite.setDepth(5);
				this.plateContentsSprites.push(sprite);
			});
		});
	}

	updateStationContentsSprites() {
		// 清除之前的工作台内容显示
		this.stationContentsSprites.forEach((sprite) => sprite.destroy());
		this.stationContentsSprites = [];

		// 为每个工作台显示状态
		this.stations.children.entries.forEach((station) => {
			const isProcessing = station.getData('isProcessing');
			const processedItem = station.getData('processedItem');
			const processingItem = station.getData('processingItem');

			if (isProcessing && processingItem) {
				// 显示正在处理的物品
				const sprite = this.add.sprite(
					station.x,
					station.y - 20,
					processingItem.type
				);
				sprite.setScale(0.5);
				sprite.setDepth(6);
				sprite.setAlpha(0.7);
				this.stationContentsSprites.push(sprite);

				// 添加处理中的旋转动画
				this.tweens.add({
					targets: sprite,
					rotation: Math.PI * 2,
					duration: 2000,
					repeat: -1,
					ease: 'Linear',
				});
			} else if (processedItem && processedItem.ready) {
				// 显示处理完成的物品
				const sprite = this.add.sprite(
					station.x,
					station.y - 20,
					processedItem.type
				);
				sprite.setScale(0.6);
				sprite.setDepth(6);
				this.stationContentsSprites.push(sprite);

				// 添加完成的闪烁效果
				this.tweens.add({
					targets: sprite,
					alpha: 0.5,
					duration: 500,
					yoyo: true,
					repeat: -1,
					ease: 'Sine.easeInOut',
				});
			}
		});
	}

	handlePlayerMovement() {
		// 确保玩家对象存在
		if (!this.player) {
			console.warn('⚠️ 玩家对象不存在，跳过移动处理');
			return;
		}

		const speed = this.gameConfig.playerSpeed;
		let velocityX = 0;
		let velocityY = 0;
		let direction = null;

		// 处理移动输入
		if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
			velocityX = -speed;
			direction = 'left';
		} else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
			velocityX = speed;
			direction = 'right';
		}

		if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
			velocityY = -speed;
			direction = 'up';
		} else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
			velocityY = speed;
			direction = 'down';
		}

		this.player.setVelocity(velocityX, velocityY);

		// 处理角色动画
		const playerType = this.player.getData('playerType');
		const currentDirection = this.player.getData('currentDirection');
		const isMoving = velocityX !== 0 || velocityY !== 0;

		if (isMoving && direction) {
			// 播放行走动画
			if (currentDirection !== direction) {
				this.player.setData('currentDirection', direction);
				this.player.play(`${playerType}_walk_${direction}`);
			}
		} else {
			// 播放待机动画
			const idleDirection = currentDirection || 'down';
			if (
				!this.player.anims.currentAnim ||
				this.player.anims.currentAnim.key.includes('walk')
			) {
				this.player.play(`${playerType}_idle_${idleDirection}`);
			}
		}
	}

	updateUI() {
		// 发送游戏状态更新事件
		this.emitGameStateUpdate();
	}

	getItemDisplayName(type) {
		const displayNames = {
			tomato: '番茄',
			lettuce: '生菜',
			bread: '面包',
			chopped_tomato: '切好的番茄',
			chopped_lettuce: '切好的生菜',
			cooked_tomato: '烹饪番茄',
			cooked_lettuce: '烹饪生菜',
			burnt_tomato: '烤糊的番茄',
			burnt_lettuce: '烤糊的生菜',
			prepared_plate: '装好的盘子',
			plate: '干净盘子',
			dirty_plate: '脏盘子',
			extinguisher: '灭火器',
		};
		return displayNames[type] || type;
	}

	handleInteractionHighlight() {
		// 清除之前的高亮
		this.clearHighlights();

		// 检查附近可交互的对象
		const nearbyObjects = this.getNearbyInteractableObjects();
		nearbyObjects.forEach((obj) => {
			obj.setTint(0xffff00); // 黄色高亮
		});
	}

	clearHighlights() {
		this.ingredients.children.entries.forEach((item) => item.clearTint());
		this.stations.children.entries.forEach((station) => station.clearTint());
		this.plates.children.entries.forEach((plate) => plate.clearTint());
		this.washStation.children.entries.forEach((washStation) =>
			washStation.clearTint()
		);
		this.trash.children.entries.forEach((trash) => trash.clearTint());
		this.groundItems.children.entries.forEach((groundItem) =>
			groundItem.clearTint()
		);
		this.extinguisher.children.entries.forEach((extinguisher) =>
			extinguisher.clearTint()
		);
	}

	getNearbyInteractableObjects() {
		// 确保玩家对象存在
		if (!this.player) {
			console.warn('⚠️ 玩家对象不存在，返回空的交互对象列表');
			return [];
		}

		const nearby = [];
		const playerX = this.player.x;
		const playerY = this.player.y;
		const distance = this.gameConfig.interactionDistance;
		// 检查食材
		this.ingredients.children.entries.forEach((item) => {
			if (
				Phaser.Math.Distance.Between(playerX, playerY, item.x, item.y) <
				distance
			) {
				nearby.push(item);
			}
		});

		// 检查工作台
		this.stations.children.entries.forEach((station) => {
			if (
				Phaser.Math.Distance.Between(playerX, playerY, station.x, station.y) <
				distance
			) {
				nearby.push(station);
			}
		});

		// 检查盘子（包括干净盘子和脏盘子）
		this.plates.children.entries.forEach((plate) => {
			// 只检测可见且活跃的盘子
			if (
				plate.active &&
				plate.visible &&
				Phaser.Math.Distance.Between(playerX, playerY, plate.x, plate.y) <
					distance
			) {
				nearby.push(plate);
			}
		});

		// 检查洗碗槽
		this.washStation.children.entries.forEach((washStation) => {
			if (
				Phaser.Math.Distance.Between(
					playerX,
					playerY,
					washStation.x,
					washStation.y
				) < distance
			) {
				nearby.push(washStation);
			}
		});

		// 检查垃圾桶
		this.trash.children.entries.forEach((trash) => {
			if (
				Phaser.Math.Distance.Between(playerX, playerY, trash.x, trash.y) <
				distance
			) {
				nearby.push(trash);
			}
		});

		// 检查地面物品
		this.groundItems.children.entries.forEach((groundItem) => {
			if (
				Phaser.Math.Distance.Between(
					playerX,
					playerY,
					groundItem.x,
					groundItem.y
				) < distance
			) {
				nearby.push(groundItem);
			}
		});

		// 检查灭火器
		this.extinguisher.children.entries.forEach((extinguisher) => {
			// 只检测可见且活跃的灭火器
			if (
				extinguisher.active &&
				extinguisher.visible &&
				Phaser.Math.Distance.Between(
					playerX,
					playerY,
					extinguisher.x,
					extinguisher.y
				) < distance
			) {
				nearby.push(extinguisher);
			}
		});

		return nearby;
	}

	handleIngredientInteraction(player, ingredient) {
		if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
			if (!this.playerHolding) {
				// 拾取食材
				this.playerHolding = {
					type: ingredient.getData('type'),
					originalType: ingredient.getData('originalType'),
				};

				// 创建拾取效果
				this.createPickupEffect(ingredient.x, ingredient.y);

				// 重新生成食材
				this.respawnIngredient(ingredient);

				this.showMessage(
					`拾取了 ${this.getItemDisplayName(this.playerHolding.type)}`,
					0x2ed573
				);

				// 发送游戏状态更新事件
				this.emitGameStateUpdate();

				// 多人游戏：立即同步手持物品状态
				if (this.gameMode === 'multiplayer') {
					this.syncPlayerPosition(); // 这会同时同步位置和手持物品
				}
			}
		}
	}

	respawnIngredient(ingredient) {
		const originalType = ingredient.getData('originalType');

		// 延迟重新生成
		this.time.delayedCall(2000, () => {
			ingredient.setTexture(originalType);
			ingredient.setData('type', originalType);
			ingredient.setVisible(true);
			ingredient.setActive(true);
		});

		// 暂时隐藏
		ingredient.setVisible(false);
		ingredient.setActive(false);
	}

	handleStationInteraction(player, station) {
		const stationType = station.getData('type');
		const isProcessing = station.getData('isProcessing');
		const processedItem = station.getData('processedItem');
		const isOnFire = station.getData('isOnFire');

		// 如果烹饪台着火，优先处理灭火
		if (
			isOnFire &&
			this.playerHolding &&
			this.playerHolding.type === 'extinguisher'
		) {
			if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
				this.extinguishFire(station);
				return;
			}
		}

		if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
			// 空格键：取回完成的物品或在出餐口递交订单
			if (stationType === 'serving') {
				// 出餐口逻辑：需要手持装好的盘子
				this.handleServingStation(station);
				return;
			}

			if (processedItem && processedItem.ready && !this.playerHolding) {
				this.playerHolding = { type: processedItem.type };
				station.setData('processedItem', null);

				// 更新工作台内容 - 移除已取回的物品
				const currentContents = station.getData('contents') || [];
				const itemIndex = currentContents.indexOf(processedItem.type);
				if (itemIndex > -1) {
					currentContents.splice(itemIndex, 1);
					station.setData('contents', currentContents);
				}

				console.log('📦 取回物品，工作台状态:', {
					takenItem: processedItem.type,
					remainingContents: currentContents,
					stationType: station.getData('type'),
				});

				// 清除所有相关计时器（防止取回物品后还有计时器运行）
				const completionTimer = station.getData('completionTimer');
				if (completionTimer) {
					completionTimer.remove();
					station.setData('completionTimer', null);
				}

				const burntTimer = station.getData('burntTimer');
				if (burntTimer) {
					burntTimer.remove();
					station.setData('burntTimer', null);
				}

				const fireTimer = station.getData('fireTimer');
				if (fireTimer) {
					fireTimer.remove();
					station.setData('fireTimer', null);
				}

				// 清除着火倒计时状态和进度条
				station.setData('fireCountdown', false);
				station.setData('fireCountdownStartTime', null);

				const fireCountdownProgressBg = station.getData(
					'fireCountdownProgressBg'
				);
				if (fireCountdownProgressBg) {
					fireCountdownProgressBg.destroy();
					station.setData('fireCountdownProgressBg', null);
				}

				const fireCountdownProgressBar = station.getData(
					'fireCountdownProgressBar'
				);
				if (fireCountdownProgressBar) {
					fireCountdownProgressBar.destroy();
					station.setData('fireCountdownProgressBar', null);
				}

				const fireCountdownProgressTimer = station.getData(
					'fireCountdownProgressTimer'
				);
				if (fireCountdownProgressTimer) {
					fireCountdownProgressTimer.remove();
					station.setData('fireCountdownProgressTimer', null);
				}

				// 清除超时进度条
				const overtimeTimer = station.getData('overtimeTimer');
				if (overtimeTimer) {
					overtimeTimer.remove();
					station.setData('overtimeTimer', null);
				}

				const overtimeBg = station.getData('overtimeBg');
				if (overtimeBg) {
					overtimeBg.destroy();
					station.setData('overtimeBg', null);
				}

				const overtimeBar = station.getData('overtimeBar');
				if (overtimeBar) {
					overtimeBar.destroy();
					station.setData('overtimeBar', null);
				}

				// 检查烹饪台是否还在着火
				const isOnFire = station.getData('isOnFire');

				// 只有在没有着火的情况下才恢复烹饪台纹理
				if (stationType === 'cooking' && !isOnFire) {
					station.setTexture('cooking_station');
				}

				// 特殊处理烤糊食物的提示信息
				if (
					processedItem.type === 'burnt_tomato' ||
					processedItem.type === 'burnt_lettuce'
				) {
					if (isOnFire) {
						this.showMessage(
							`取回了 ${this.getItemDisplayName(
								this.playerHolding.type
							)}，请用灭火器灭火后烹饪台可恢复使用！`,
							0xffa502
						);
					} else {
						this.showMessage(
							`取回了 ${this.getItemDisplayName(
								this.playerHolding.type
							)}，烹饪台已恢复可用！`,
							0x2ed573
						);
					}
				} else {
					this.showMessage(
						`取回了 ${this.getItemDisplayName(this.playerHolding.type)}`,
						0x2ed573
					);
				}

				// 多人游戏：同步工作台状态和手持物品状态
				if (this.gameMode === 'multiplayer') {
					this.syncStationState(station);
					this.syncPlayerPosition(); // 这会同时同步位置和手持物品
				}
				return;
			}
		}

		if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
			// E键：开始加工
			if (stationType === 'serving') {
				this.showMessage(
					'出餐口用于递交完成的订单，请手持装好的盘子并按空格键',
					0xffa502
				);
				return;
			}

			if (isOnFire) {
				if (this.playerHolding && this.playerHolding.type === 'extinguisher') {
					this.showMessage('按E键使用灭火器灭火', 0xffa502);
				} else {
					this.showMessage('烹饪台着火了！需要灭火器灭火！', 0xff6b6b);
				}
				return;
			}

			// 检查是否有烤糊食物（即使没有着火，有烤糊食物也不能使用）
			if (
				processedItem &&
				(processedItem.type === 'burnt_tomato' ||
					processedItem.type === 'burnt_lettuce')
			) {
				this.showMessage('烹饪台有烤糊食物，请先用空格键拾取！', 0xff6b6b);
				return;
			}

			if (isProcessing) {
				this.showMessage('工作台正在使用中...', 0xffa502);
				return;
			}

			if (processedItem && processedItem.ready) {
				this.showMessage('请先用空格键取回完成的食材', 0xffa502);
				return;
			}

			if (this.playerHolding) {
				this.processItemAtStation(station, stationType);
			} else {
				this.showMessage(
					`请先拿取食材再使用${this.getStationName(stationType)}`,
					0xff6b6b
				);
			}
		}
	}

	handlePlateInteraction(player, plate) {
		const contents = plate.getData('contents') || [];
		const plateType = plate.getData('plateType') || 'clean'; // clean, dirty

		if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
			if (this.playerHolding) {
				// 玩家手持物品的情况
				if (
					this.playerHolding.type === 'plate' || // 🔧 修复：更新类型名称
					this.playerHolding.type === 'dirty_plate'
				) {
					// 手持盘子，放下盘子
					this.placePlateOnGround(this.player.x, this.player.y);
				} else if (this.playerHolding.type === 'prepared_plate') {
					// 手持装好的盘子，放下装好的盘子
					this.placePreparedPlateOnGround(this.player.x, this.player.y);
				} else if (plateType === 'clean' && contents.length === 0) {
					// 空的干净盘子，将手持物品放到盘子上
					contents.push(this.playerHolding.type);
					plate.setData('contents', contents);

					this.showMessage(
						`将 ${this.getItemDisplayName(this.playerHolding.type)} 放到盘子上`,
						0x2ed573
					);
					this.playerHolding = null;

					// 发送游戏状态更新事件
					this.emitGameStateUpdate();

					// 多人游戏：同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(plate);
					}
				} else if (plateType === 'clean' && contents.length > 0) {
					// 有内容的盘子，将手持物品放到盘子上
					contents.push(this.playerHolding.type);
					plate.setData('contents', contents);

					this.showMessage(
						`将 ${this.getItemDisplayName(this.playerHolding.type)} 放到盘子上`,
						0x2ed573
					);
					this.playerHolding = null;

					// 发送游戏状态更新事件
					this.emitGameStateUpdate();

					// 多人游戏：同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(plate);
					}
				} else {
					this.showMessage('无法将物品放到这个盘子上', 0xff6b6b);
				}
			} else {
				// 玩家手上没有物品的情况
				if (plateType === 'dirty') {
					// 拾取脏盘子 - 记录盘子ID并隐藏盘子
					this.playerHolding = {
						type: 'dirty_plate',
						plateId: plate.getData('plateId'),
					};

					// 只隐藏盘子，但保持active状态（这样其他玩家仍可交互）
					plate.setVisible(false);
					// 不设置 setActive(false)，保持盘子可交互

					console.log('🍽️ 拾取脏盘子:', {
						plateId: plate.getData('plateId'),
						playerHolding: this.playerHolding,
						plateVisible: false,
						plateActive: true, // 保持活跃状态
					});

					this.showMessage('拾取了脏盘子，去洗碗槽清洗', 0x2ed573);

					// 多人游戏：立即同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(plate);
						this.syncPlayerPosition(); // 同步手持物品
					}
				} else if (contents.length === 0) {
					// 拾取空的干净盘子 - 记录盘子ID并隐藏盘子
					this.playerHolding = {
						type: 'plate', // 🔧 修复：使用'plate'而不是'clean_plate'，避免与纹理名称混淆
						plateId: plate.getData('plateId'),
					};

					// 只隐藏盘子，但保持active状态（这样其他玩家仍可交互）
					plate.setVisible(false);
					// 不设置 setActive(false)，保持盘子可交互

					console.log('🍽️ 拾取干净盘子:', {
						plateId: plate.getData('plateId'),
						playerHolding: this.playerHolding,
						plateVisible: false,
						plateActive: true, // 保持活跃状态
					});

					this.showMessage('拾取了空盘子', 0x2ed573);

					// 多人游戏：立即同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(plate);
						this.syncPlayerPosition(); // 同步手持物品
					}
				} else if (contents.length > 0) {
					// 直接取回最后一个食材，不需要额外确认
					const lastItem = contents.pop();
					plate.setData('contents', contents);
					this.playerHolding = { type: lastItem };

					this.showMessage(
						`从盘子中取回了 ${this.getItemDisplayName(lastItem)}`,
						0x2ed573
					);

					// 多人游戏：同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(plate);
						this.syncPlayerPosition(); // 同步手持物品
					}
				}

				// 发送游戏状态更新事件
				this.emitGameStateUpdate();
			}
		} else if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
			if (plateType === 'clean' && contents.length > 0 && !this.playerHolding) {
				// E键：拿起整个装好的盘子
				this.playerHolding = {
					type: 'prepared_plate',
					contents: [...contents],
					plateId: plate.getData('plateId'), // 记录被使用的盘子ID
				};
				plate.setData('contents', []);

				// 隐藏被使用的盘子（因为现在在玩家手中）
				plate.setVisible(false);
				// 不设置 setActive(false)，保持盘子可交互（其他玩家仍可看到状态变化）

				const contentsDisplay = contents
					.map((item) => this.getItemDisplayName(item))
					.join(', ');
				this.showMessage(`拿起了装有 ${contentsDisplay} 的盘子`, 0x2ed573);

				console.log('🍽️ 拿起装好的盘子:', {
					plateId: plate.getData('plateId'),
					contents: contents,
					plateHidden: true,
					plateActive: true, // 保持活跃状态
				});

				// 多人游戏：同步盘子状态和手持物品
				if (this.gameMode === 'multiplayer') {
					this.syncPlateState(plate);
					this.syncPlayerPosition(); // 同步手持物品
				}

				// 发送游戏状态更新事件
				this.emitGameStateUpdate();
			} else if (plateType === 'clean' && contents.length === 0) {
				this.showMessage('盘子是空的，用空格键可以拾取空盘子', 0xffa502);
			} else if (plateType === 'dirty') {
				this.showMessage('脏盘子需要先清洗，用空格键拾取', 0xffa502);
			} else {
				this.showMessage('手上已有物品，无法拿起盘子', 0xff6b6b);
			}
		}
	}

	handleWashStationInteraction(player, washStation) {
		const isWashing = washStation.getData('isWashing');
		const cleanPlate = washStation.getData('cleanPlate');

		// 🔧 简化空格键逻辑：由于盘子现在自动回到原位，主要用于清理洗碗槽状态
		if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
			if (cleanPlate) {
				// 清除cleanPlate状态
				washStation.setData('cleanPlate', false);
				this.showMessage('洗碗槽已清理完毕', 0x2ed573);

				// 多人游戏：同步洗碗槽状态
				if (this.gameMode === 'multiplayer') {
					this.syncWashStationState(washStation);
				}
				return;
			} else {
				this.showMessage('洗碗槽无需清理', 0xa4b0be);
				return;
			}
		}

		if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
			// E键：开始清洗脏盘子
			if (isWashing) {
				this.showMessage('洗碗槽正在使用中...', 0xffa502);
				return;
			}

			// 🔧 移除cleanPlate检查，因为现在盘子自动回到原位
			// if (cleanPlate) {
			// 	this.showMessage('洗碗槽中还有清洗完的盘子，请按空格键清理', 0xffa502);
			// 	return;
			// }

			if (this.playerHolding && this.playerHolding.type === 'dirty_plate') {
				this.startWashing(washStation);
			} else {
				this.showMessage('请先拿取脏盘子再使用洗碗槽', 0xff6b6b);
			}
		}
	}

	handleTrashInteraction(player, trash) {
		if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
			if (this.playerHolding) {
				const itemType = this.playerHolding.type;

				// 检查是否是烤糊的食物
				if (itemType === 'burnt_tomato' || itemType === 'burnt_lettuce') {
					this.showMessage('烤糊的食物已丢弃！', 0x2ed573);
					this.createTrashEffect(trash.x, trash.y);

					// 清空手持物品
					this.playerHolding = null;

					// 多人游戏：立即同步手持物品状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlayerPosition(); // 这会同时同步位置和手持物品
					}

					// 发送游戏状态更新事件
					this.emitGameStateUpdate();

					console.log('🗑️ 烤糊食物已丢弃:', {
						itemType: itemType,
						playerHolding: this.playerHolding,
					});
				} else if (this.playerHolding.type === 'prepared_plate') {
					this.showMessage('丢弃了装好的盘子', 0xff6b6b);
					this.createTrashEffect(trash.x, trash.y);

					// 清空手持物品
					this.playerHolding = null;

					// 多人游戏：立即同步手持物品状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlayerPosition();
					}

					// 发送游戏状态更新事件
					this.emitGameStateUpdate();
				} else {
					// 其他物品不能丢弃到垃圾桶
					this.showMessage(
						`${this.getItemDisplayName(itemType)} 不能丢弃到垃圾桶`,
						0xff6b6b
					);
				}
			} else {
				this.showMessage('没有物品可以丢弃', 0xa4b0be);
			}
		}
	}

	handleGroundItemInteraction(player, groundItem) {
		if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
			if (!this.playerHolding) {
				const itemType = groundItem.getData('type');
				const itemContents = groundItem.getData('contents');

				// 多人游戏：同步地面物品移除
				if (this.gameMode === 'multiplayer') {
					this.syncGroundItemRemove(groundItem);
				}

				// 拾取地面物品
				if (itemType === 'prepared_plate' || itemContents) {
					// 装好的盘子
					this.playerHolding = {
						type: 'prepared_plate',
						contents: itemContents || [],
					};
				} else {
					// 普通物品
					this.playerHolding = {
						type: itemType,
						contents: itemContents || null,
					};
				}

				// 创建拾取效果
				this.createPickupEffect(groundItem.x, groundItem.y);

				// 移除地面物品
				groundItem.destroy();

				this.showMessage(
					`拾取了 ${this.getItemDisplayName(this.playerHolding.type)}`,
					0x2ed573
				);

				// 发送游戏状态更新事件
				this.emitGameStateUpdate();

				// 多人游戏：立即同步手持物品状态
				if (this.gameMode === 'multiplayer') {
					this.syncPlayerPosition(); // 这会同时同步位置和手持物品
				}
			} else {
				this.showMessage('手上已有物品，无法拾取', 0xff6b6b);
			}
		}
	}

	handleExtinguisherInteraction(player, extinguisher) {
		if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
			if (!this.playerHolding) {
				// 拾取灭火器
				this.playerHolding = {
					type: 'extinguisher',
					extinguisherObject: extinguisher, // 保存灭火器对象引用
				};

				// 只隐藏灭火器，不设置setActive(false)，这样碰撞检测仍然有效
				extinguisher.setVisible(false);
				// extinguisher.setActive(false); // 移除这行，保持碰撞检测

				console.log('🧯 拾取灭火器:', {
					position: { x: extinguisher.x, y: extinguisher.y },
					visible: false,
					active: true, // 保持活跃状态
					playerHolding: this.playerHolding,
				});

				// 多人游戏：同步灭火器状态（被拾取）
				if (this.gameMode === 'multiplayer') {
					this.syncExtinguisherState(
						{ x: extinguisher.x, y: extinguisher.y },
						true, // isHeld = true
						false, // visible = false
						true // active = true
					);
					this.syncPlayerPosition(); // 同步手持物品
				}

				this.showMessage('拾取了灭火器，去灭火吧！', 0x2ed573);

				// 发送游戏状态更新事件
				this.emitGameStateUpdate();
			} else {
				this.showMessage('手上已有物品，无法拾取灭火器', 0xff6b6b);
			}
		}
	}

	// 在空白区域放置物品
	handleGroundPlacement() {
		if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.playerHolding) {
			// 检查是否在合适的位置放置（避免与其他对象重叠）
			const playerX = this.player.x;
			const playerY = this.player.y;

			// 检查放置位置是否合适
			if (this.isValidPlacementPosition(playerX, playerY)) {
				if (this.playerHolding.type === 'extinguisher') {
					// 放下灭火器 - 恢复灭火器对象的可见性和位置
					const extinguisherObj = this.playerHolding.extinguisherObject;
					if (extinguisherObj) {
						extinguisherObj.setPosition(playerX, playerY);
						extinguisherObj.setVisible(true);
						// 确保灭火器是活跃的（虽然拾取时没有设置为false，但为了保险起见）
						extinguisherObj.setActive(true);

						// 强制更新物理体位置（确保碰撞检测正确）
						if (extinguisherObj.body) {
							extinguisherObj.body.updateFromGameObject();
						}

						console.log('🧯 放下灭火器:', {
							position: { x: playerX, y: playerY },
							visible: true,
							active: true,
							hasBody: !!extinguisherObj.body,
							bodyPosition: extinguisherObj.body
								? { x: extinguisherObj.body.x, y: extinguisherObj.body.y }
								: null,
						});

						// 多人游戏：同步灭火器状态（被放下）
						if (this.gameMode === 'multiplayer') {
							this.syncExtinguisherState(
								{ x: playerX, y: playerY },
								false, // isHeld = false
								true, // visible = true
								true // active = true
							);
						}

						this.showMessage('放下了灭火器', 0x2ed573);
					} else {
						// 如果没有保存的对象引用，创建新的灭火器（向后兼容）
						const newExtinguisher = this.extinguisher
							.create(playerX, playerY, 'extinguisher')
							.setSize(48, 48)
							.setScale(1.5);

						console.log('🧯 创建新灭火器（向后兼容）:', {
							position: { x: playerX, y: playerY },
							visible: true,
							active: true,
							scale: 1.5,
						});

						// 多人游戏：同步灭火器状态（新创建）
						if (this.gameMode === 'multiplayer') {
							this.syncExtinguisherState(
								{ x: playerX, y: playerY },
								false, // isHeld = false
								true, // visible = true
								true // active = true
							);
						}

						this.showMessage('放下了灭火器', 0x2ed573);
					}

					// 清空玩家手持
					this.playerHolding = null;

					// 发送游戏状态更新事件
					this.emitGameStateUpdate();

					// 多人游戏：同步手持物品变化
					if (this.gameMode === 'multiplayer') {
						this.syncPlayerPosition();
					}
				} else if (this.playerHolding.type === 'prepared_plate') {
					// 装好的盘子特殊处理 - 调用专用方法
					this.placePreparedPlateOnGround(playerX, playerY);
				} else if (
					this.playerHolding.type === 'plate' ||
					this.playerHolding.type === 'dirty_plate'
				) {
					// 🔧 修复：空盘子和脏盘子应该调用placePlateOnGround方法，而不是创建地面物品
					this.placePlateOnGround(playerX, playerY);
				} else {
					// 普通物品（食材等）
					// 🔧 修复：确保使用正确的纹理名称
					let textureKey = this.playerHolding.type;
					if (textureKey === 'plate') {
						textureKey = 'plate_sprite'; // 使用plate_sprite纹理而不是不存在的plate纹理
					}

					let groundItem = this.groundItems.create(
						playerX,
						playerY,
						textureKey
					);
					groundItem.setData('type', this.playerHolding.type);

					// 根据物品类型设置不同的尺寸
					groundItem.setSize(28, 28); // 普通物品

					// 如果是装好的盘子，保存内容
					if (this.playerHolding.contents) {
						groundItem.setData('contents', this.playerHolding.contents);
					}

					this.showMessage(
						`放下了 ${this.getItemDisplayName(this.playerHolding.type)}`,
						0x2ed573
					);

					// 多人游戏：同步地面物品添加
					if (this.gameMode === 'multiplayer') {
						this.syncGroundItemAdd(groundItem);
					}

					// 清空玩家手持
					this.playerHolding = null;

					// 发送游戏状态更新事件
					this.emitGameStateUpdate();

					// 多人游戏：同步手持物品变化
					if (this.gameMode === 'multiplayer') {
						this.syncPlayerPosition();
					}
				}
			} else {
				this.showMessage('这里无法放置物品', 0xff6b6b);
			}
		}
	}

	showMessage(text, color = 0xffffff) {
		// 安全检查：确保场景还有效且this.add存在
		if (!this.add || this.scene.isDestroyed || !this.scene.isActive()) {
			console.warn('⚠️ 场景已销毁或无效，跳过显示消息:', text);
			return;
		}

		if (this.messageText) {
			this.messageText.destroy();
		}

		this.messageText = this.add
			.text(400, 300, text, {
				fontSize: '24px',
				fill: `#${color.toString(16).padStart(6, '0')}`,
				fontFamily: 'Arial',
				backgroundColor: 'rgba(0,0,0,0.8)',
				padding: { x: 20, y: 10 },
				originX: 0.5,
				originY: 0.5,
			})
			.setDepth(200);

		this.tweens.add({
			targets: this.messageText,
			alpha: 0,
			duration: 2000,
			delay: 1000,
			onComplete: () => {
				if (this.messageText) {
					this.messageText.destroy();
					this.messageText = null;
				}
			},
		});
	}

	emitGameStateUpdate() {
		const gameState = {
			currentOrder: this.currentOrder,
			score: this.score,
			timeLeft: this.timeLeft,
			completedOrders: this.completedOrders,
			playerHolding: this.playerHolding ? this.playerHolding.type : null,
			recipeSteps: this.currentOrder
				? this.getRecipeSteps(this.currentOrder.id)
				: '',
		};

		// 发送自定义事件到window对象
		window.dispatchEvent(
			new CustomEvent('gameStateUpdate', { detail: gameState })
		);
	}

	// 特效方法
	createPickupEffect(x, y) {
		const effect = this.add
			.text(x, y, '+', {
				fontSize: '20px',
				fill: '#2ED573',
				fontFamily: 'Arial',
			})
			.setDepth(100);

		this.tweens.add({
			targets: effect,
			y: y - 30,
			alpha: 0,
			duration: 1000,
			onComplete: () => effect.destroy(),
		});
	}

	createTrashEffect(x, y) {
		const effect = this.add
			.text(x, y, '🗑️', {
				fontSize: '20px',
				fontFamily: 'Arial',
			})
			.setDepth(100)
			.setOrigin(0.5);

		this.tweens.add({
			targets: effect,
			scaleX: 0.5,
			scaleY: 0.5,
			alpha: 0,
			duration: 1000,
			onComplete: () => effect.destroy(),
		});
	}

	isValidPlacementPosition(x, y) {
		const minDistance = 50; // 最小距离

		// 检查是否与现有对象太近
		const allObjects = [
			...this.ingredients.children.entries,
			...this.stations.children.entries,
			...this.plates.children.entries,
			...this.washStation.children.entries,
			...this.trash.children.entries,
			...this.groundItems.children.entries,
			...this.extinguisher.children.entries, // 添加灭火器对象
			...this.walls.children.entries, // 添加墙壁对象
		];

		for (const obj of allObjects) {
			// 如果是灭火器且当前正在放下灭火器，跳过距离检查
			if (
				this.playerHolding &&
				this.playerHolding.type === 'extinguisher' &&
				this.extinguisher.children.entries.includes(obj)
			) {
				continue;
			}

			// 对于墙壁，使用更严格的距离检查
			const distance = this.walls.children.entries.includes(obj)
				? 40
				: minDistance;

			if (Phaser.Math.Distance.Between(x, y, obj.x, obj.y) < distance) {
				return false;
			}
		}

		// 检查是否在游戏区域内（避免放在UI区域）
		if (x < 80 || x > 720 || y < 100 || y > 500) {
			return false;
		}

		return true;
	}

	getStationName(type) {
		const names = {
			cutting: '切菜台',
			cooking: '烹饪台',
			serving: '出餐口',
		};
		return names[type] || type;
	}

	handleServingStation(station) {
		// 检查玩家是否手持盘子
		if (!this.playerHolding || this.playerHolding.type !== 'prepared_plate') {
			this.showMessage('请先准备好装有食材的盘子', 0xff6b6b);
			return;
		}

		// 检查盘子内容是否符合订单要求
		const plateContents = this.playerHolding.contents || [];
		if (this.checkOrderMatch(plateContents)) {
			this.completeOrderAtServing();
		} else {
			this.showMessage('盘子内容不符合订单要求', 0xff6b6b);
		}
	}

	checkOrderMatch(plateContents) {
		const requiredIngredients = [...this.currentOrder.ingredients];
		const tempPlateContents = [...plateContents];

		// 检查是否包含所有必需的食材
		for (const ingredient of requiredIngredients) {
			const index = tempPlateContents.indexOf(ingredient);
			if (index !== -1) {
				tempPlateContents.splice(index, 1);
			} else {
				return false;
			}
		}

		// 检查是否有多余的食材
		return tempPlateContents.length === 0;
	}

	completeOrderAtServing() {
		if (this.gameEnded) return;

		// 保存原来的盘子内容用于清空匹配的盘子
		const plateContents = this.playerHolding
			? this.playerHolding.contents || []
			: [];

		// 找到被使用的盘子（通过plateId）
		const usedPlate =
			this.playerHolding && this.playerHolding.plateId
				? this.findPlateById(this.playerHolding.plateId)
				: this.findPlateByContents(plateContents); // 向后兼容

		console.log('🍽️ 出餐完成，查找使用的盘子:', {
			playerHolding: this.playerHolding,
			plateContents: plateContents,
			usedPlateId: this.playerHolding?.plateId,
			foundPlate: usedPlate
				? {
						id: usedPlate.getData('plateId'),
						position: { x: usedPlate.x, y: usedPlate.y },
						visible: usedPlate.visible,
						active: usedPlate.active,
				  }
				: null,
		});

		// 清空玩家手持
		this.playerHolding = null;

		// 多人游戏：立即同步手持物品状态
		if (this.gameMode === 'multiplayer') {
			this.syncPlayerPosition(); // 这会同时同步位置和手持物品

			// 清空所有匹配内容的盘子
			this.clearMatchingPlates(plateContents);
		}

		// 计算新的分数和订单数
		const newScore = this.score + this.currentOrder.points;
		const newCompletedOrders = this.completedOrders + 1;

		// 创建完成效果
		this.createOrderCompletionEffect(500, 280); // 出餐口位置

		// 显示完成消息
		this.showMessage(
			`订单完成！获得 ${this.currentOrder.points} 分！`,
			0xffd700
		);

		// 将使用的盘子变为脏盘子
		this.convertPlateToDirty(usedPlate, plateContents);

		// 停止当前订单计时器
		if (this.orderTimer) {
			this.orderTimer.remove();
			this.orderTimer = null;
		}

		if (this.gameMode === 'multiplayer') {
			// 多人模式：通过云函数同步分数到服务器
			console.log('🎮 多人模式：同步分数到服务器', {
				currentScore: this.score,
				orderPoints: this.currentOrder.points,
				newScore: newScore,
				newCompletedOrders: newCompletedOrders,
			});

			// 设置订单处理标志，防止被服务器状态覆盖
			this.isProcessingOrder = true;
			this.lastOrderCompletionTime = Date.now();

			// 调用云函数完成订单，服务器会累加分数并生成新订单
			multiplayerManager
				.completeOrder({
					points: this.currentOrder.points,
					orderId: this.currentOrder.id,
					playerId: this.currentPlayerId,
				})
				.then((result) => {
					if (result && result.success) {
						console.log('✅ 服务器分数同步成功:', {
							serverScore: result.newScore,
							serverCompletedOrders: result.newCompletedOrders,
							newOrder: result.newOrder,
						});

						// 更新本地状态为服务器返回的最新状态
						this.score = result.newScore;
						this.completedOrders = result.newCompletedOrders;
						this.currentOrder = result.newOrder;

						// 重新启动订单计时器
						if (result.newOrder && !this.gameEnded) {
							this.startOrderTimer();
						}

						// 清除订单处理标志
						this.isProcessingOrder = false;
					} else {
						console.error('❌ 服务器分数同步失败:', result);
						// 如果服务器同步失败，仍然更新本地状态
						this.score = newScore;
						this.completedOrders = newCompletedOrders;

						// 生成新订单（本地备用方案）
						this.time.delayedCall(2000, () => {
							if (!this.gameEnded) {
								this.generateOrder();
							}
						});

						// 清除订单处理标志
						this.isProcessingOrder = false;
					}
				})
				.catch((error) => {
					console.error('❌ 调用完成订单云函数失败:', error);
					// 如果云函数调用失败，仍然更新本地状态
					this.score = newScore;
					this.completedOrders = newCompletedOrders;

					// 生成新订单（本地备用方案）
					this.time.delayedCall(2000, () => {
						if (!this.gameEnded) {
							this.generateOrder();
						}
					});

					// 清除订单处理标志
					this.isProcessingOrder = false;
				});
		} else {
			// 单机模式：直接更新本地分数
			this.score = newScore;
			this.completedOrders = newCompletedOrders;

			// 发送游戏状态更新事件
			this.emitGameStateUpdate();

			// 生成新订单
			this.time.delayedCall(2000, () => {
				if (!this.gameEnded) {
					this.generateOrder();
				}
			});
		}
	}

	processItemAtStation(station, stationType) {
		const itemType = this.playerHolding.type;
		let canProcess = false;
		let processTime = 0;
		let resultType = '';

		switch (stationType) {
			case 'cutting':
				if (itemType === 'tomato' || itemType === 'lettuce') {
					canProcess = true;
					processTime = this.gameConfig.choppingTime;
					resultType = `chopped_${itemType}`;
				}
				break;
			case 'cooking':
				if (itemType === 'chopped_tomato' || itemType === 'chopped_lettuce') {
					canProcess = true;
					processTime = this.gameConfig.cookingTime;
					resultType = itemType.replace('chopped_', 'cooked_');
				}
				break;
			case 'serving':
				// 出餐口不用于加工，给出提示
				this.showMessage(
					'出餐口用于递交完成的订单，请将装好的盘子放在这里',
					0xffa502
				);
				return;
		}

		if (canProcess) {
			if (stationType === 'cooking') {
				// 烹饪台：自动处理模式
				this.startAutoCooking(station, stationType, resultType, processTime);
			} else {
				// 其他工作台：原有的手动处理模式
				this.startProcessing(station, stationType, resultType, processTime);
			}
		} else {
			this.showMessage(
				`无法在${this.getStationName(stationType)}处理${this.getItemDisplayName(
					itemType
				)}`,
				0xff6b6b
			);
		}
	}

	startProcessing(station, stationType, resultType, processTime) {
		station.setData('isProcessing', true);
		station.setData('processingItem', this.playerHolding);
		station.setData('resultType', resultType);
		station.setData('startTime', this.time.now);

		// 设置工作台内容 - 将正在处理的物品添加到contents中
		const currentContents = station.getData('contents') || [];
		currentContents.push(this.playerHolding.type);
		station.setData('contents', currentContents);

		console.log('🔧 开始处理，工作台状态:', {
			stationType,
			processingItem: this.playerHolding,
			resultType,
			contents: currentContents,
			isProcessing: true,
		});

		// 清空玩家手持
		this.playerHolding = null;

		// 多人游戏：同步工作台状态和手持物品状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
			this.syncPlayerPosition(); // 这会同时同步位置和手持物品
		}

		// 显示处理中效果
		this.showProcessingEffect(station, processTime);

		// 开始粒子效果
		if (stationType === 'cooking') {
			this.cookingParticles.setPosition(station.x, station.y - 20);
			this.cookingParticles.start();
		}

		this.showMessage(
			`开始使用${this.getStationName(stationType)}...`,
			0x2ed573
		);

		// 处理完成后的回调
		const completionTimer = this.time.delayedCall(processTime, () => {
			this.completeProcessing(station, stationType, resultType);
		});
		station.setData('completionTimer', completionTimer);

		// 如果是烹饪台，设置烤糊计时器
		if (stationType === 'cooking') {
			const burntTimer = this.time.delayedCall(
				this.gameConfig.burntTime,
				() => {
					this.burnFood(station, stationType);
				}
			);
			station.setData('burntTimer', burntTimer);
		}
	}

	startAutoCooking(station, stationType, resultType, processTime) {
		// 检查烹饪台是否着火
		const isOnFire = station.getData('isOnFire');
		if (isOnFire) {
			this.showMessage('烹饪台着火了！请先用灭火器灭火！', 0xff6b6b);
			return;
		}

		station.setData('isProcessing', true);
		station.setData('processingItem', this.playerHolding);
		station.setData('resultType', resultType);
		station.setData('startTime', this.time.now);

		// 设置工作台内容 - 将正在处理的物品添加到contents中
		const currentContents = station.getData('contents') || [];
		currentContents.push(this.playerHolding.type);
		station.setData('contents', currentContents);

		console.log('🔥 开始自动烹饪，工作台状态:', {
			stationType,
			processingItem: this.playerHolding,
			resultType,
			contents: currentContents,
			isProcessing: true,
			cookingTime: processTime,
		});

		// 清空玩家手持
		this.playerHolding = null;

		// 多人游戏：同步工作台状态和手持物品状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
			this.syncPlayerPosition(); // 这会同时同步位置和手持物品
		}

		// 显示处理中效果（绿色进度条）
		this.showProcessingEffect(station, processTime);

		// 开始粒子效果
		this.cookingParticles.setPosition(station.x, station.y - 20);
		this.cookingParticles.start();

		this.showMessage(`食材已放入烹饪台，开始自动烹饪...`, 0x2ed573);

		// 烹饪完成计时器（3秒后完成烹饪）
		const completionTimer = this.time.delayedCall(processTime, () => {
			this.completeAutoCooking(station, stationType, resultType);
		});
		station.setData('completionTimer', completionTimer);

		// 注意：不在这里设置着火计时器，着火倒计时只在烹饪完成后开始
	}

	startWashing(washStation) {
		// 记录正在洗的脏盘子（从玩家手中获取）
		const dirtyPlateId = this.playerHolding ? this.playerHolding.plateId : null;
		const dirtyPlate = dirtyPlateId ? this.findPlateById(dirtyPlateId) : null;

		washStation.setData('isWashing', true);
		washStation.setData('startTime', this.time.now); // 新增：记录开始清洗的时间
		washStation.setData('washingPlate', dirtyPlate); // 记录正在洗的盘子

		console.log('🚿 开始洗碗:', {
			dirtyPlateId,
			startTime: this.time.now,
			dirtyPlate: dirtyPlate
				? {
						id: dirtyPlate.getData('plateId'),
						position: { x: dirtyPlate.x, y: dirtyPlate.y },
						plateType: dirtyPlate.getData('plateType'),
				  }
				: null,
		});

		// 清空玩家手持
		this.playerHolding = null;

		// 多人游戏：同步洗碗槽状态和手持物品状态
		if (this.gameMode === 'multiplayer') {
			this.syncWashStationState(washStation);
			this.syncPlayerPosition(); // 这会同时同步位置和手持物品
		}

		// 显示清洗中效果
		this.showProcessingEffect(washStation, this.gameConfig.washTime);

		this.showMessage('开始清洗盘子...', 0x2ed573);

		// 清洗完成后的回调
		this.time.delayedCall(this.gameConfig.washTime, () => {
			this.completeWashing(washStation);
		});
	}

	completeWashing(washStation) {
		const washingPlate = washStation.getData('washingPlate');

		washStation.setData('isWashing', false);
		washStation.setData('startTime', null); // 清除开始时间
		washStation.setData('currentUser', null); // 清除当前用户
		washStation.setData('washingPlate', null); // 清除正在洗的盘子记录

		// 如果有正在洗的盘子，在原始位置创建新的干净盘子并销毁脏盘子
		if (washingPlate) {
			const plateId = washingPlate.getData('plateId');
			const originalPosition = washingPlate.getData('originalPosition');

			// 使用原始位置作为新盘子的生成位置（降低游戏难度）
			const cleanPlatePosition = originalPosition || {
				x: washStation.x + 50, // 如果没有原始位置，仍使用洗碗槽右侧作为后备
				y: washStation.y,
			};

			console.log('🚿 洗碗完成，在原始位置创建新的干净盘子:', {
				plateId,
				originalPosition,
				cleanPlatePosition,
				dirtyPlatePosition: { x: washingPlate.x, y: washingPlate.y },
			});

			// 创建新的干净盘子对象，使用正确的纹理
			const cleanPlate = this.plates.create(
				cleanPlatePosition.x,
				cleanPlatePosition.y,
				'plate_sprite' // 🔧 修复：使用与初始化盘子相同的纹理
			);
			cleanPlate.setData('plateType', 'clean');
			cleanPlate.setData('contents', []);

			cleanPlate.setData('plateId', plateId); // 保持相同的ID
			cleanPlate.setData('originalPosition', originalPosition); // 保持原始位置信息
			cleanPlate.setSize(40, 40); // 调大盘子碰撞尺寸
			cleanPlate.setScale(1.3); // 调大盘子显示尺寸
			cleanPlate.setVisible(true);
			cleanPlate.setActive(true);

			// 从盘子池中移除脏盘子，添加新的干净盘子
			const poolIndex = this.platePool.findIndex((p) => p === washingPlate);
			if (poolIndex !== -1) {
				this.platePool[poolIndex] = cleanPlate;
				console.log('🚿 更新盘子池（洗碗完成）:', {
					plateId,
					poolIndex,
					oldPlate: 'dirty_plate_object',
					newPlate: 'clean_plate_object',
				});
			}

			// 销毁脏盘子对象（延迟销毁，确保引用安全）
			this.time.delayedCall(100, () => {
				if (washingPlate && washingPlate.scene) {
					washingPlate.destroy();
					console.log('🚿 脏盘子对象已销毁:', { plateId });
				}
			});

			console.log('🚿 洗碗完成，新盘子状态:', {
				plateId,
				newPosition: cleanPlatePosition,
				plateType: 'clean',
				texture: 'plate_sprite',
				isOriginalPosition: originalPosition ? true : false,
			});

			// 🔧 修复：由于盘子已自动回到原位，直接清除cleanPlate状态，避免误提示
			washStation.setData('cleanPlate', false);

			// 多人游戏：同步盘子状态
			if (this.gameMode === 'multiplayer') {
				this.time.delayedCall(50, () => {
					this.syncPlateState(cleanPlate);
				});
			}

			// 根据是否在原始位置显示不同的提示信息
			if (originalPosition) {
				this.showMessage('盘子清洗完成！已回到原来的位置', 0xffd700);
			} else {
				this.showMessage('盘子清洗完成！已放在洗碗槽旁边', 0xffd700);
			}
		} else {
			// 🔧 修复：如果没有正在洗的盘子，也清除cleanPlate状态
			washStation.setData('cleanPlate', false);
			this.showMessage('洗碗槽已清理完毕', 0x2ed573);
		}

		// 多人游戏：同步洗碗槽状态
		if (this.gameMode === 'multiplayer') {
			this.syncWashStationState(washStation);
		}

		// 创建完成效果
		this.createCompletionEffect(washStation.x, washStation.y);
	}

	extinguishFire(station) {
		// 灭火过程
		station.setData('isOnFire', false);

		// 检查是否有烤糊食物
		const processedItem = station.getData('processedItem');
		const hasBurntFood =
			processedItem &&
			(processedItem.type === 'burnt_tomato' ||
				processedItem.type === 'burnt_lettuce');

		// 灭火后总是恢复正常纹理，不管是否有烤糊食物
		station.setTexture('cooking_station');

		// 灭火器不消耗，玩家继续持有
		// this.playerHolding = null; // 移除这行，让玩家继续持有灭火器

		// 多人游戏：同步工作台状态（不需要同步手持物品，因为没有变化）
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
		}

		// 创建灭火效果
		this.createExtinguishEffect(station.x, station.y);

		if (hasBurntFood) {
			this.showMessage('火已扑灭！请拾取烤糊食物恢复烹饪台', 0xffa502);
		} else {
			this.showMessage('火已扑灭！烹饪台已恢复可用', 0x2ed573);
		}

		// 发送游戏状态更新事件
		this.emitGameStateUpdate();
	}

	placePlateOnGround(x, y) {
		// 检查放置位置是否合适
		if (this.isValidPlacementPosition(x, y)) {
			// 🔧 优化：当放下空盘子时，销毁旧盘子并在新位置创建新盘子
			if (this.playerHolding.plateId) {
				const oldPlate = this.findPlateById(this.playerHolding.plateId);
				if (oldPlate) {
					// 保存重要信息
					const plateId = this.playerHolding.plateId;
					const originalPosition = oldPlate.getData('originalPosition');
					const plateType =
						this.playerHolding.type === 'dirty_plate' ? 'dirty' : 'clean';
					// 🔧 修复：确保使用与初始化盘子相同的纹理
					const plateTexture =
						this.playerHolding.type === 'dirty_plate'
							? 'dirty_plate'
							: 'plate_sprite'; // 使用plate_sprite而不是plate

					console.log('🍽️ 优化盘子放置 - 销毁旧盘子并创建新盘子:', {
						plateId,
						oldPosition: { x: oldPlate.x, y: oldPlate.y },
						newPosition: { x, y },
						originalPosition,
						plateType,
						plateTexture, // 记录使用的纹理
					});

					// 从盘子池中移除旧盘子
					const poolIndex = this.platePool.findIndex((p) => p === oldPlate);

					// 销毁旧盘子对象
					oldPlate.destroy();

					// 在新位置创建新盘子
					const newPlate = this.plates.create(x, y, plateTexture);
					newPlate.setData('contents', []);
					newPlate.setData('plateType', plateType);
					newPlate.setData('plateId', plateId); // 保持相同的ID
					newPlate.setData('originalPosition', originalPosition); // 保持原始位置信息
					newPlate.setSize(40, 40); // 调大盘子碰撞尺寸
					newPlate.setScale(1.3); // 调大盘子显示尺寸
					newPlate.setVisible(true);
					newPlate.setActive(true);

					// 更新盘子池
					if (poolIndex !== -1) {
						this.platePool[poolIndex] = newPlate;
						console.log('🍽️ 更新盘子池（放置盘子）:', {
							plateId,
							poolIndex,
							newPosition: { x, y },
						});
					}

					// 多人游戏：同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(newPlate);
					}
				}
			} else {
				// 如果没有plateId，创建新盘子（向后兼容）
				let plateTexture = 'plate_sprite'; // 🔧 修复：使用正确的纹理
				let plateType = 'clean';

				if (this.playerHolding.type === 'dirty_plate') {
					plateTexture = 'dirty_plate';
					plateType = 'dirty';
				}

				// 在地面创建盘子
				const plate = this.plates.create(x, y, plateTexture);
				plate.setData('contents', []);
				plate.setData('plateType', plateType);
				plate.setSize(40, 40); // 调大盘子碰撞尺寸
				plate.setScale(1.3); // 调大盘子显示尺寸

				console.log('🍽️ 创建新盘子（向后兼容）:', {
					position: { x, y },
					plateType,
					plateTexture, // 记录使用的纹理
				});
			}

			this.showMessage(
				`放下了 ${this.getItemDisplayName(this.playerHolding.type)}`,
				0x2ed573
			);

			// 清空玩家手持
			this.playerHolding = null;

			// 发送游戏状态更新事件
			this.emitGameStateUpdate();
		} else {
			this.showMessage('这里无法放置盘子', 0xff6b6b);
		}
	}

	placePreparedPlateOnGround(x, y) {
		// 检查放置位置是否合适
		if (this.isValidPlacementPosition(x, y)) {
			// 🔧 优化：当放下装好的盘子时，销毁旧盘子并在新位置创建新盘子
			if (this.playerHolding.plateId) {
				const oldPlate = this.findPlateById(this.playerHolding.plateId);
				if (oldPlate) {
					// 保存重要信息
					const plateId = this.playerHolding.plateId;
					const originalPosition = oldPlate.getData('originalPosition');
					const contents = [...this.playerHolding.contents];

					console.log('🍽️ 优化装好盘子放置 - 销毁旧盘子并创建新盘子:', {
						plateId,
						oldPosition: { x: oldPlate.x, y: oldPlate.y },
						newPosition: { x, y },
						originalPosition,
						contents,
					});

					// 从盘子池中移除旧盘子
					const poolIndex = this.platePool.findIndex((p) => p === oldPlate);

					// 销毁旧盘子对象
					oldPlate.destroy();

					// 在新位置创建新盘子
					const newPlate = this.plates.create(x, y, 'plate_sprite');
					newPlate.setData('contents', contents);
					newPlate.setData('plateType', 'clean');
					newPlate.setData('plateId', plateId); // 保持相同的ID
					newPlate.setData('originalPosition', originalPosition); // 保持原始位置信息
					newPlate.setSize(40, 40); // 调大盘子碰撞尺寸
					newPlate.setScale(1.3); // 调大盘子显示尺寸
					newPlate.setVisible(true);
					newPlate.setActive(true);

					// 更新盘子池
					if (poolIndex !== -1) {
						this.platePool[poolIndex] = newPlate;
						console.log('🍽️ 更新盘子池（放置装好盘子）:', {
							plateId,
							poolIndex,
							newPosition: { x, y },
							contents,
						});
					}

					// 多人游戏：同步盘子状态
					if (this.gameMode === 'multiplayer') {
						this.syncPlateState(newPlate);
					}
				} else {
					console.warn('⚠️ 找不到对应的盘子，创建新盘子');
					// 如果找不到对应的盘子，创建新盘子（向后兼容）
					const plate = this.plates.create(x, y, 'plate_sprite');
					plate.setData('contents', [...this.playerHolding.contents]);
					plate.setData('plateType', 'clean');
					plate.setSize(40, 40); // 调大盘子碰撞尺寸
					plate.setScale(1.3); // 调大盘子显示尺寸
				}
			} else {
				// 如果没有plateId，创建新盘子（向后兼容）
				const plate = this.plates.create(x, y, 'plate_sprite');
				plate.setData('contents', [...this.playerHolding.contents]);
				plate.setData('plateType', 'clean');
				plate.setSize(40, 40); // 调大盘子碰撞尺寸
				plate.setScale(1.3); // 调大盘子显示尺寸

				console.log('🍽️ 创建新装好的盘子（向后兼容）:', {
					position: { x, y },
					contents: this.playerHolding.contents,
				});
			}

			const contentsDisplay = this.playerHolding.contents
				.map((item) => this.getItemDisplayName(item))
				.join(', ');

			this.showMessage(`放下了装有 ${contentsDisplay} 的盘子`, 0x2ed573);

			// 清空玩家手持
			this.playerHolding = null;

			// 多人游戏：同步手持物品
			if (this.gameMode === 'multiplayer') {
				this.syncPlayerPosition();
			}

			// 发送游戏状态更新事件
			this.emitGameStateUpdate();
		} else {
			this.showMessage('这里无法放置盘子', 0xff6b6b);
		}
	}

	// 特效方法
	createCompletionEffect(x, y) {
		const effect = this.add
			.text(x, y, '✓', {
				fontSize: '24px',
				fill: '#FFD700',
				fontFamily: 'Arial',
			})
			.setDepth(100)
			.setOrigin(0.5);

		this.tweens.add({
			targets: effect,
			scaleX: 1.5,
			scaleY: 1.5,
			alpha: 0,
			duration: 1500,
			onComplete: () => effect.destroy(),
		});
	}

	createOrderCompletionEffect(x, y) {
		const effect = this.add
			.text(x, y, '🎉', {
				fontSize: '32px',
				fontFamily: 'Arial',
			})
			.setDepth(100)
			.setOrigin(0.5);

		this.tweens.add({
			targets: effect,
			y: y - 50,
			scaleX: 2,
			scaleY: 2,
			alpha: 0,
			duration: 2000,
			onComplete: () => effect.destroy(),
		});
	}

	createExtinguishEffect(x, y) {
		const effect = this.add
			.text(x, y, '💨', {
				fontSize: '24px',
				fontFamily: 'Arial',
			})
			.setDepth(100)
			.setOrigin(0.5);

		this.tweens.add({
			targets: effect,
			y: y - 30,
			scaleX: 2,
			scaleY: 2,
			alpha: 0,
			duration: 2000,
			onComplete: () => effect.destroy(),
		});
	}

	showProcessingEffect(station, duration) {
		// 创建进度条
		const progressBg = this.add.graphics();
		progressBg.fillStyle(0x333333);
		progressBg.fillRect(station.x - 30, station.y - 40, 60, 8);
		progressBg.setDepth(50);

		const progressBar = this.add.graphics();
		progressBar.fillStyle(0x2ed573);
		progressBar.setDepth(51);

		// 动画进度条
		let progress = 0;
		const progressTimer = this.time.addEvent({
			delay: 50,
			callback: () => {
				progress += 50 / duration;
				progressBar.clear();
				progressBar.fillStyle(0x2ed573);
				progressBar.fillRect(station.x - 28, station.y - 38, 56 * progress, 4);

				if (progress >= 1) {
					progressTimer.remove();
					progressBg.destroy();
					progressBar.destroy();
				}
			},
			loop: true,
		});
	}

	completeProcessing(station, stationType, resultType) {
		station.setData('isProcessing', false);
		station.setData('processedItem', {
			type: resultType,
			ready: true,
		});

		// 更新工作台内容 - 移除原材料，添加成品
		const currentContents = station.getData('contents') || [];
		const processingItem = station.getData('processingItem');
		if (processingItem) {
			const itemIndex = currentContents.indexOf(processingItem.type);
			if (itemIndex > -1) {
				currentContents.splice(itemIndex, 1);
			}
		}
		currentContents.push(resultType);
		station.setData('contents', currentContents);

		console.log('✅ 处理完成，工作台状态:', {
			stationType,
			processedItem: { type: resultType, ready: true },
			contents: currentContents,
			isProcessing: false,
		});

		// 多人游戏：同步工作台状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
		}

		// 停止粒子效果
		if (stationType === 'cooking') {
			this.cookingParticles.stop();
		}

		// 创建完成效果
		this.createCompletionEffect(station.x, station.y);

		this.showMessage(
			`${this.getStationName(stationType)}完成！按空格键取回`,
			0xffd700
		);
	}

	completeAutoCooking(station, stationType, resultType) {
		station.setData('isProcessing', false);
		station.setData('processedItem', {
			type: resultType,
			ready: true,
		});

		// 确保烹饪台纹理正确（防止显示为绿色方块）
		if (stationType === 'cooking') {
			station.setTexture('cooking_station');
		}

		// 更新工作台内容 - 移除原材料，添加成品
		const currentContents = station.getData('contents') || [];
		const processingItem = station.getData('processingItem');
		if (processingItem) {
			const itemIndex = currentContents.indexOf(processingItem.type);
			if (itemIndex > -1) {
				currentContents.splice(itemIndex, 1);
			}
		}
		currentContents.push(resultType);
		station.setData('contents', currentContents);

		console.log('🍳 自动烹饪完成，工作台状态:', {
			stationType,
			processedItem: { type: resultType, ready: true },
			contents: currentContents,
			isProcessing: false,
			texture: station.texture.key, // 添加纹理信息到日志
		});

		// 多人游戏：同步工作台状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
		}

		// 停止粒子效果
		this.cookingParticles.stop();

		// 创建完成效果
		this.createCompletionEffect(station.x, station.y);

		this.showMessage('烹饪完成！按空格键取回食材，否则5秒后会着火！', 0xffd700);

		// 清除原来的着火计时器
		const fireTimer = station.getData('fireTimer');
		if (fireTimer) {
			fireTimer.remove();
			station.setData('fireTimer', null);
		}

		// 启动着火倒计时（5秒）
		this.startFireCountdown(station);
	}

	startFireCountdown(station) {
		console.log('🔥 开始着火倒计时，5秒后着火');

		// 设置着火倒计时状态
		station.setData('fireCountdown', true);
		station.setData('fireCountdownStartTime', this.time.now);

		// 显示着火倒计时进度条（红色）
		this.showFireCountdownEffect(station, this.gameConfig.fireCountdownTime);

		// 启动着火倒计时（5秒）
		const fireTimer = this.time.addEvent({
			delay: this.gameConfig.fireCountdownTime,
			callback: () => {
				// 清除着火倒计时状态
				station.setData('fireCountdown', false);
				station.setData('fireCountdownStartTime', null);

				// 同时产生烤糊食物和着火
				this.burnFood(station, 'cooking');
				this.startFire(station, 'cooking');
			},
		});
		station.setData('fireTimer', fireTimer);

		// 多人游戏：同步工作台状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
		}
	}

	showFireCountdownEffect(station, duration) {
		// 创建红色进度条背景
		const progressBg = this.add.graphics();
		progressBg.fillStyle(0x333333);
		progressBg.fillRect(station.x - 30, station.y - 40, 60, 8);
		progressBg.setDepth(50);

		const progressBar = this.add.graphics();
		progressBar.fillStyle(0xff4444); // 红色表示危险
		progressBar.setDepth(51);

		// 动画进度条（倒计时效果）
		let progress = 1; // 从满开始倒计时
		const progressTimer = this.time.addEvent({
			delay: 50,
			callback: () => {
				progress -= 50 / duration;
				progressBar.clear();
				progressBar.fillStyle(0xff4444);
				progressBar.fillRect(
					station.x - 28,
					station.y - 38,
					56 * Math.max(0, progress),
					4
				);

				if (progress <= 0) {
					progressTimer.remove();
					progressBg.destroy();
					progressBar.destroy();
				}
			},
			loop: true,
		});

		// 保存进度条引用，以便在取回食物时清除
		station.setData('fireCountdownProgressBg', progressBg);
		station.setData('fireCountdownProgressBar', progressBar);
		station.setData('fireCountdownProgressTimer', progressTimer);
	}

	burnFood(station, stationType) {
		const processingItem = station.getData('processingItem');
		if (!processingItem) return;

		const burntType = processingItem.type.replace('chopped_', 'burnt_');

		station.setData('isProcessing', false);
		station.setData('processedItem', {
			type: burntType,
			ready: true,
		});

		// 更新工作台内容 - 移除原材料，添加烤糊的食物
		const currentContents = station.getData('contents') || [];
		const itemIndex = currentContents.indexOf(processingItem.type);
		if (itemIndex > -1) {
			currentContents.splice(itemIndex, 1);
		}
		currentContents.push(burntType);
		station.setData('contents', currentContents);

		console.log('🔥 食物烤糊，工作台状态:', {
			stationType,
			processedItem: { type: burntType, ready: true },
			contents: currentContents,
			isProcessing: false,
		});

		// 多人游戏：同步工作台状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
		}

		// 停止粒子效果
		this.cookingParticles.stop();

		// 创建烤糊效果
		this.createBurntEffect(station.x, station.y);

		this.showMessage('食物烤糊了！请拾取烤糊食物恢复烹饪台', 0xff6b6b);
	}

	startFire(station, stationType) {
		station.setData('isOnFire', true);
		station.setTexture('fire_cooking_station'); // 修复：使用正确的纹理名称

		// 检查是否有烤糊食物，如果有则保留
		const processedItem = station.getData('processedItem');
		const hasBurntFood =
			processedItem &&
			(processedItem.type === 'burnt_tomato' ||
				processedItem.type === 'burnt_lettuce');

		if (hasBurntFood) {
			// 有烤糊食物时，只清理正在处理的状态，保留烤糊食物
			station.setData('isProcessing', false);
			// 保留 processedItem（烤糊食物）
			// 保留 contents（包含烤糊食物）

			console.log('🔥 工作台着火，保留烤糊食物:', {
				stationType,
				isOnFire: true,
				processedItem: processedItem,
				contents: station.getData('contents'),
				isProcessing: false,
			});
		} else {
			// 没有烤糊食物时，清空所有内容
			station.setData('contents', []);
			station.setData('isProcessing', false);
			station.setData('processedItem', null);

			console.log('🔥 工作台着火，清空内容:', {
				stationType,
				isOnFire: true,
				contents: [],
				isProcessing: false,
			});
		}

		// 多人游戏：同步工作台状态
		if (this.gameMode === 'multiplayer') {
			this.syncStationState(station);
		}

		// 停止粒子效果
		this.cookingParticles.stop();

		// 创建着火效果
		this.createFireEffect(station.x, station.y);

		if (hasBurntFood) {
			this.showMessage('烹饪台着火了！请用灭火器灭火！', 0xff6b6b);
		} else {
			this.showMessage('烹饪台着火了！快用灭火器灭火！', 0xff6b6b);
		}

		// 清除所有计时器
		const completionTimer = station.getData('completionTimer');
		if (completionTimer) {
			completionTimer.remove();
			station.setData('completionTimer', null);
		}

		const burntTimer = station.getData('burntTimer');
		if (burntTimer) {
			burntTimer.remove();
			station.setData('burntTimer', null);
		}
	}

	createBurntEffect(x, y) {
		const effect = this.add
			.text(x, y, '💨', {
				fontSize: '20px',
				fontFamily: 'Arial',
			})
			.setDepth(100)
			.setOrigin(0.5);

		this.tweens.add({
			targets: effect,
			y: y - 30,
			alpha: 0,
			duration: 2000,
			onComplete: () => effect.destroy(),
		});
	}

	createFireEffect(x, y) {
		const effect = this.add
			.text(x, y, '🔥', {
				fontSize: '24px',
				fontFamily: 'Arial',
			})
			.setDepth(100)
			.setOrigin(0.5);

		this.tweens.add({
			targets: effect,
			scaleX: 1.5,
			scaleY: 1.5,
			alpha: 0.5,
			duration: 500,
			yoyo: true,
			repeat: -1,
		});

		// 5秒后移除效果
		this.time.delayedCall(5000, () => {
			effect.destroy();
		});
	}

	// 清空匹配内容的盘子（用于订单完成后同步）
	clearMatchingPlates(plateContents) {
		console.log('🍽️ 开始清空匹配的盘子:', { plateContents });

		// 查找所有包含相同内容的盘子
		this.plates.children.entries.forEach((plate) => {
			const contents = plate.getData('contents') || [];

			// 检查盘子内容是否与递交的盘子内容匹配
			if (this.arraysEqual(contents, plateContents)) {
				console.log('🍽️ 找到匹配的盘子，清空内容:', {
					plateId: plate.getData('plateId'),
					oldContents: contents,
					position: { x: plate.x, y: plate.y },
				});

				// 清空盘子内容
				plate.setData('contents', []);

				// 同步到服务器
				this.syncPlateState(plate);
			}
		});
	}

	// 辅助方法：比较两个数组是否相等
	arraysEqual(arr1, arr2) {
		if (arr1.length !== arr2.length) return false;

		const sorted1 = [...arr1].sort();
		const sorted2 = [...arr2].sort();

		return sorted1.every((val, index) => val === sorted2[index]);
	}

	// 找到被使用的盘子（通过内容匹配）
	findPlateByContents(contents) {
		return this.plates.children.entries.find((plate) => {
			const plateContents = plate.getData('contents') || [];
			return this.arraysEqual(plateContents, contents);
		});
	}

	// 将使用的盘子变为脏盘子
	convertPlateToDirty(plate, contents) {
		if (plate) {
			const plateId = plate.getData('plateId');
			const originalPosition = plate.getData('originalPosition');

			console.log('🍽️ 开始转换盘子为脏盘子（创建新对象）:', {
				plateId,
				originalPosition,
				currentPosition: { x: plate.x, y: plate.y },
				currentVisible: plate.visible,
				currentActive: plate.active,
			});

			// 第一步：隐藏并禁用原盘子对象
			plate.setVisible(false);
			plate.setActive(false);

			// 第二步：创建新的脏盘子对象
			const dirtyPlate = this.plates.create(570, 320, 'dirty_plate');
			dirtyPlate.setData('contents', []);
			dirtyPlate.setData('plateType', 'dirty');
			dirtyPlate.setData('plateId', plateId); // 保持相同的ID
			dirtyPlate.setData('originalPosition', originalPosition); // 保持原始位置信息
			dirtyPlate.setSize(40, 40); // 调大盘子碰撞尺寸
			dirtyPlate.setScale(1.3); // 调大盘子显示尺寸
			dirtyPlate.setVisible(true);
			dirtyPlate.setActive(true);

			console.log('🍽️ 创建新的脏盘子对象:', {
				plateId,
				newPosition: { x: dirtyPlate.x, y: dirtyPlate.y },
				plateType: 'dirty',
				texture: 'dirty_plate',
				visible: true,
				active: true,
			});

			// 第三步：从盘子池中移除旧盘子，添加新盘子
			const poolIndex = this.platePool.findIndex((p) => p === plate);
			if (poolIndex !== -1) {
				this.platePool[poolIndex] = dirtyPlate;
				console.log('🍽️ 更新盘子池:', {
					plateId,
					poolIndex,
					oldPlate: 'removed',
					newPlate: 'dirty_plate_object',
				});
			}

			// 第四步：销毁旧盘子对象（延迟销毁，确保引用安全）
			this.time.delayedCall(100, () => {
				if (plate && plate.scene) {
					plate.destroy();
					console.log('🍽️ 旧盘子对象已销毁:', { plateId });
				}
			});

			// 第五步：同步到服务器
			if (this.gameMode === 'multiplayer') {
				this.time.delayedCall(50, () => {
					this.syncPlateState(dirtyPlate);
					console.log('🍽️ 脏盘子状态同步完成:', {
						plateId,
						finalState: {
							position: { x: dirtyPlate.x, y: dirtyPlate.y },
							plateType: dirtyPlate.getData('plateType'),
							visible: dirtyPlate.visible,
							active: dirtyPlate.active,
							texture: dirtyPlate.texture.key,
						},
					});
				});
			}

			this.showMessage('脏盘子出现在出餐台右侧！', 0xa4b0be);
		} else {
			console.warn('⚠️ 无法找到被使用的盘子，无法生成脏盘子');
			this.showMessage('警告：无法生成脏盘子', 0xff6b6b);
		}
	}

	findPlateById(id) {
		return this.plates.children.entries.find(
			(plate) => plate.getData('plateId') === id
		);
	}

	// 场景销毁时清理资源
	destroy() {
		// 停止并销毁背景音乐
		if (this.bgmSound) {
			if (this.bgmSound.isPlaying) {
				this.bgmSound.stop();
			}
			this.bgmSound.destroy();
			this.bgmSound = null;
			console.log('🎵 背景音乐资源已清理');
		}

		// 清理计时器
		if (this.gameTimer) {
			this.gameTimer.remove();
			this.gameTimer = null;
		}

		if (this.orderTimer) {
			this.orderTimer.remove();
			this.orderTimer = null;
		}

		if (this.syncTimer) {
			this.syncTimer.remove();
			this.syncTimer = null;
		}

		// 清理时间同步定时器
		if (this.timeSyncTimer) {
			this.timeSyncTimer.remove();
			this.timeSyncTimer = null;
			console.log('🕐 时间同步定时器已清理');
		}

		// 调用父类的destroy方法
		super.destroy();
	}

	// 同步服务器时间偏移
	async syncServerTime() {
		try {
			const timeSync = await multiplayerManager.getServerTime();
			if (timeSync.success) {
				this.serverTimeOffset = timeSync.offset;
				this.lastTimeSync = Date.now();
				console.log('🕐 服务器时间同步成功:', {
					serverTime: timeSync.serverTime,
					localTime: timeSync.localTime,
					offset: this.serverTimeOffset,
				});
			} else {
				console.warn('⚠️ 服务器时间同步失败:', timeSync.error);
				this.serverTimeOffset = 0;
			}
		} catch (error) {
			console.error('❌ 服务器时间同步异常:', error);
			this.serverTimeOffset = 0;
		}
	}

	// 启动定期时间同步
	startTimeSync() {
		if (this.timeSyncTimer) {
			this.timeSyncTimer.remove();
		}

		this.timeSyncTimer = this.time.addEvent({
			delay: this.timeSyncInterval,
			callback: () => {
				this.syncServerTime();
			},
			loop: true,
		});

		console.log(
			'🕐 启动定期时间同步，间隔:',
			this.timeSyncInterval / 1000,
			'秒'
		);
	}

	// 启动基于时间戳的计时器
	startTimestampBasedTimer() {
		if (this.gameTimer) {
			this.gameTimer.remove();
		}

		this.gameTimer = this.time.addEvent({
			delay: 100, // 每100ms更新一次
			callback: () => {
				this.updateTimestampBasedTimer();
			},
			loop: true,
		});

		console.log('⏰ 启动基于时间戳的计时器');
	}

	// 更新基于时间戳的计时器
	updateTimestampBasedTimer() {
		if (!this.gameStartTime || this.gameEnded) {
			return;
		}

		// 使用服务器时间偏移计算当前时间
		const currentTime = Date.now() + this.serverTimeOffset;
		const elapsedTime = currentTime - this.gameStartTime;
		const timeLeft = Math.max(0, this.gameDuration - elapsedTime);

		// 更新时间（秒）
		this.timeLeft = Math.ceil(timeLeft / 1000);

		// 检查游戏是否结束
		if (timeLeft <= 0 && !this.gameEnded) {
			console.log('⏰ 基于时间戳的游戏时间结束');
			this.gameOver();
		}
	}

	// 获取同步后的当前时间
	getSyncedCurrentTime() {
		return Date.now() + this.serverTimeOffset;
	}
}
