const { deepClone, assign } = require('../../utils/util.js');

Page({
	data: {
		departure: '',
		arrival: '',
		startDate: '',
		endDate: '',
		adults: 2,
		includeBasicFares: true,
		nonstopFlights: false,
		searchText: '',
		flights: [],
		selectedFlights: [],
		loading: false,
	},

	onLoad(options) {
		console.log('页面加载，初始化数据', options);
		this.setData({
			selectedFlights: [],
		});
		getApp().globalData.selectedFlights = [];
		this.loadFlights();
	},

	onShow() {
		// 获取当前日期
		const today = new Date();
		const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

		this.setData({
			startDate: this.formatDate(today),
			endDate: this.formatDate(tomorrow),
		});

		// 检查是否有来自首页的搜索参数
		try {
			const searchData = wx.getStorageSync('searchFromHome');
			if (searchData && searchData.searchText) {
				const timeDiff = Date.now() - searchData.timestamp;
				// 5秒内的搜索参数才有效，避免过期参数
				if (timeDiff < 5000) {
					console.log('检测到来自首页的搜索:', searchData.searchText);
					this.setData({
						searchText: searchData.searchText,
					});
					// 清除本地存储，避免重复使用
					wx.removeStorageSync('searchFromHome');
					// 执行搜索
					setTimeout(() => {
						this.searchFlights();
					}, 100);
					return; // 有搜索参数时，不执行下面的初始化逻辑
				} else {
					// 清除过期的搜索参数
					wx.removeStorageSync('searchFromHome');
				}
			}
		} catch (error) {
			console.error('读取搜索参数失败:', error);
		}

		// 只在第一次进入或者没有选择状态时才初始化
		if (!this.data.selectedFlights) {
			this.setData({
				selectedFlights: [],
			});
			getApp().globalData.selectedFlights = [];
		}

		// 保持现有的选择状态，不要清除
		console.log('页面显示，保持现有选择状态');
	},

	// 格式化日期
	formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	},

	// 输入框变化处理
	onDepartureInput(e) {
		this.setData({ departure: e.detail.value });
		// 延迟搜索，避免频繁请求
		clearTimeout(this.searchTimer);
		this.searchTimer = setTimeout(() => {
			this.loadFlights();
		}, 1000);
	},

	onArrivalInput(e) {
		this.setData({ arrival: e.detail.value });
		// 延迟搜索，避免频繁请求
		clearTimeout(this.searchTimer);
		this.searchTimer = setTimeout(() => {
			this.loadFlights();
		}, 1000);
	},

	onSearchInput(e) {
		this.setData({ searchText: e.detail.value });
	},

	// 清除搜索
	clearSearch() {
		this.setData({ searchText: '' });
		// 重新加载所有航班，但保持选择状态
		this.loadFlights();
		wx.showToast({
			title: '已清除搜索',
			icon: 'success',
			duration: 1000,
		});
	},

	// 交换出发地和目的地
	swapLocations() {
		const { departure, arrival } = this.data;
		this.setData({
			departure: arrival,
			arrival: departure,
		});
	},

	// 日期选择
	onStartDateChange(e) {
		this.setData({ startDate: e.detail.value });
	},

	onEndDateChange(e) {
		this.setData({ endDate: e.detail.value });
	},

	// 切换开关
	onBasicFaresToggle(e) {
		this.setData({ includeBasicFares: e.detail.value });
		this.loadFlights();
	},

	onNonstopToggle(e) {
		this.setData({ nonstopFlights: e.detail.value });
		this.loadFlights();
	},

	// 加载航班数据
	async loadFlights() {
		this.setData({ loading: true });

		// 保存当前的选择状态
		const currentSelectedIds = this.data.selectedFlights
			? this.data.selectedFlights.map((f) => f.id)
			: [];
		console.log('保存当前选择状态:', currentSelectedIds);

		try {
			const result = await wx.cloud.callFunction({
				name: 'getFlights',
				data: {
					departure: this.data.departure,
					arrival: this.data.arrival,
					startDate: this.data.startDate,
					endDate: this.data.endDate,
					includeBasicFares: this.data.includeBasicFares,
					nonstopFlights: this.data.nonstopFlights,
				},
			});

			if (result.result.success) {
				// 确保每个航班都有selected字段，并恢复之前的选择状态
				const flights = result.result.flights.map((flight) => {
					return assign({}, flight, {
						selected: currentSelectedIds.includes(flight.id) || false,
					});
				});

				// 重新计算选中的航班
				const selectedFlights = flights.filter((f) => f.selected);

				console.log(
					'加载的航班数据:',
					flights.map((f) => ({ id: f.id, selected: f.selected }))
				);
				console.log('恢复的选择状态:', selectedFlights.length, '个航班');

				this.setData({
					flights: flights,
					selectedFlights: selectedFlights,
				});

				// 更新全局状态
				getApp().globalData.selectedFlights = selectedFlights;
			} else {
				console.error('获取航班数据失败:', result.result.error);
				// 如果云函数调用失败，使用模拟数据
				this.loadMockFlights(currentSelectedIds);
			}
		} catch (error) {
			console.error('调用云函数失败:', error);
			// 如果云函数调用失败，使用模拟数据
			this.loadMockFlights(currentSelectedIds);
		}

		this.setData({ loading: false });
	},

	// 加载模拟航班数据
	loadMockFlights(selectedIds = []) {
		const mockFlights = [
			{
				id: '1',
				flightNumber: 'CA1234',
				airline: '中国国际航空',
				departureTime: '08:00',
				arrivalTime: '13:30',
				duration: '5小时30分钟',
				price: 1350,
				type: '直飞',
				class: '经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '波音737-800',
				terminal: 'T3',
				gate: 'A15',
				punctualityRate: 92,
				selected: selectedIds.includes('1') || false,
			},
			{
				id: '2',
				flightNumber: 'MU5678',
				airline: '中国东方航空',
				departureTime: '09:00',
				arrivalTime: '16:15',
				duration: '7小时15分钟',
				price: 2550,
				type: '1次中转',
				class: '商务舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '空客A330-300',
				terminal: 'T2',
				gate: 'B23',
				punctualityRate: 88,
				selected: selectedIds.includes('2') || false,
			},
			{
				id: '3',
				flightNumber: 'CZ9012',
				airline: '中国南方航空',
				departureTime: '07:30',
				arrivalTime: '12:50',
				duration: '5小时20分钟',
				price: 1230,
				type: '直飞',
				class: '经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '波音777-300ER',
				terminal: 'T2',
				gate: 'C08',
				punctualityRate: 95,
				selected: selectedIds.includes('3') || false,
			},
			{
				id: '4',
				flightNumber: 'HU3456',
				airline: '海南航空',
				departureTime: '06:50',
				arrivalTime: '12:30',
				duration: '5小时40分钟',
				price: 1370,
				type: '直飞',
				class: '经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '空客A350-900',
				terminal: 'T1',
				gate: 'D12',
				punctualityRate: 90,
				selected: selectedIds.includes('4') || false,
			},
			{
				id: '5',
				flightNumber: '9C7890',
				airline: '春秋航空',
				departureTime: '10:00',
				arrivalTime: '18:00',
				duration: '8小时00分钟',
				price: 880,
				type: '1次中转',
				class: '基础经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '空客A320',
				terminal: 'T2',
				gate: 'E35',
				punctualityRate: 85,
				selected: selectedIds.includes('5') || false,
			},
		];

		// 计算选中的航班
		const selectedFlights = mockFlights.filter((f) => f.selected);

		console.log(
			'模拟数据加载完成，恢复选择状态:',
			selectedFlights.length,
			'个航班'
		);

		this.setData({
			flights: mockFlights,
			selectedFlights: selectedFlights,
		});

		// 更新全局状态
		getApp().globalData.selectedFlights = selectedFlights;
	},

	// 选择航班
	toggleFlightSelection(e) {
		console.log('=== 开始选择航班 ===');
		const flightId = e.currentTarget.dataset.flightId;
		console.log('航班ID:', flightId);

		// 获取当前航班数据的副本
		let flights = JSON.parse(JSON.stringify(this.data.flights));
		console.log(
			'当前航班数据:',
			flights.map((f) => ({ id: f.id, selected: f.selected }))
		);

		// 找到目标航班
		let targetFlight = null;
		for (let i = 0; i < flights.length; i++) {
			if (flights[i].id === flightId) {
				targetFlight = flights[i];
				targetFlight.selected = !targetFlight.selected;
				console.log(
					'切换航班:',
					targetFlight.id,
					'新状态:',
					targetFlight.selected
				);
				break;
			}
		}

		if (!targetFlight) {
			console.error('未找到目标航班:', flightId);
			return;
		}

		// 计算选中的航班
		const selectedFlights = flights.filter(
			(flight) => flight.selected === true
		);
		console.log('选中航班数量:', selectedFlights.length);
		console.log(
			'选中的航班:',
			selectedFlights.map((f) => f.id)
		);

		// 检查是否超过限制
		if (selectedFlights.length > 3) {
			wx.showToast({
				title: '最多只能选择3个航班进行对比',
				icon: 'none',
			});
			return;
		}

		// 强制更新页面数据
		console.log('准备更新页面数据...');
		this.setData(
			{
				flights: flights,
				selectedFlights: selectedFlights,
			},
			() => {
				console.log('setData 回调执行');
				console.log('更新后页面状态:', {
					flightsSelected: this.data.flights.filter((f) => f.selected).length,
					selectedFlightsCount: this.data.selectedFlights.length,
				});
			}
		);

		// 更新全局数据
		getApp().globalData.selectedFlights = selectedFlights;

		console.log('=== 选择完成 ===');

		// 用户反馈
		wx.showToast({
			title: `当前选择 ${selectedFlights.length} 个航班`,
			icon: 'success',
			duration: 1000,
		});
	},

	// 重置选择
	resetSelection() {
		console.log('重置所有选择');
		const flights = this.data.flights.map((flight) => {
			return assign({}, flight, {
				selected: false,
			});
		});

		this.setData({
			flights: flights,
			selectedFlights: [],
		});

		// 清除全局数据
		getApp().globalData.selectedFlights = [];

		wx.showToast({
			title: '已重置选择',
			icon: 'success',
			duration: 1000,
		});
	},

	// 比较航班
	compareFlights() {
		const selectedFlights = this.data.selectedFlights;

		if (selectedFlights.length === 0) {
			wx.showToast({
				title: '请选择要比较的航班',
				icon: 'none',
			});
			return;
		}

		if (selectedFlights.length === 1) {
			wx.showToast({
				title: '请至少选择两个航班进行比较',
				icon: 'none',
			});
			return;
		}

		// 更新全局数据
		getApp().globalData.selectedFlights = selectedFlights;

		// 跳转到比较页面
		wx.navigateTo({
			url: '/pages/comparison/comparison',
		});
	},

	// 搜索航班
	async searchFlights() {
		const searchText = this.data.searchText.trim();

		if (!searchText) {
			// 如果搜索框为空，重新加载所有航班
			this.loadFlights();
			return;
		}

		// 显示搜索提示
		wx.showToast({
			title: '搜索中...',
			icon: 'loading',
			duration: 1000,
		});

		this.setData({ loading: true });

		// 保存当前的选择状态
		const currentSelectedIds = this.data.selectedFlights
			? this.data.selectedFlights.map((f) => f.id)
			: [];

		try {
			// 首先尝试从云函数搜索
			const result = await wx.cloud.callFunction({
				name: 'getFlights',
				data: {
					searchText: searchText, // 添加搜索参数
					departure: this.data.departure,
					arrival: this.data.arrival,
					startDate: this.data.startDate,
					endDate: this.data.endDate,
					includeBasicFares: this.data.includeBasicFares,
					nonstopFlights: this.data.nonstopFlights,
				},
			});

			if (result.result.success && result.result.flights.length > 0) {
				// 处理云函数返回的数据
				const flights = result.result.flights.map((flight) => {
					return assign({}, flight, {
						selected: currentSelectedIds.includes(flight.id) || false,
					});
				});

				const selectedFlights = flights.filter((f) => f.selected);

				this.setData({
					flights: flights,
					selectedFlights: selectedFlights,
				});

				getApp().globalData.selectedFlights = selectedFlights;

				wx.showToast({
					title: `找到 ${flights.length} 个航班`,
					icon: 'success',
				});
			} else {
				// 如果云函数没有找到结果，在模拟数据中搜索
				this.searchInMockData(searchText, currentSelectedIds);
			}
		} catch (error) {
			console.error('搜索航班失败:', error);
			// 如果云函数调用失败，在模拟数据中搜索
			this.searchInMockData(searchText, currentSelectedIds);
		}

		this.setData({ loading: false });
	},

	// 在模拟数据中搜索
	searchInMockData(searchText, selectedIds = []) {
		console.log('在模拟数据中搜索:', searchText);

		// 获取完整的模拟数据
		const allMockFlights = [
			{
				id: '1',
				flightNumber: 'CA1234',
				airline: '中国国际航空',
				departureTime: '08:00',
				arrivalTime: '13:30',
				duration: '5小时30分钟',
				price: 1350,
				type: '直飞',
				class: '经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '波音737-800',
				terminal: 'T3',
				gate: 'A15',
				punctualityRate: 92,
			},
			{
				id: '2',
				flightNumber: 'MU5678',
				airline: '中国东方航空',
				departureTime: '09:00',
				arrivalTime: '16:15',
				duration: '7小时15分钟',
				price: 2550,
				type: '1次中转',
				class: '商务舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '空客A330-300',
				terminal: 'T2',
				gate: 'B23',
				punctualityRate: 88,
			},
			{
				id: '3',
				flightNumber: 'CZ9012',
				airline: '中国南方航空',
				departureTime: '07:30',
				arrivalTime: '12:50',
				duration: '5小时20分钟',
				price: 1230,
				type: '直飞',
				class: '经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '波音777-300ER',
				terminal: 'T2',
				gate: 'C08',
				punctualityRate: 95,
			},
			{
				id: '4',
				flightNumber: 'HU3456',
				airline: '海南航空',
				departureTime: '06:50',
				arrivalTime: '12:30',
				duration: '5小时40分钟',
				price: 1370,
				type: '直飞',
				class: '经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '空客A350-900',
				terminal: 'T1',
				gate: 'D12',
				punctualityRate: 90,
			},
			{
				id: '5',
				flightNumber: '9C7890',
				airline: '春秋航空',
				departureTime: '10:00',
				arrivalTime: '18:00',
				duration: '8小时00分钟',
				price: 880,
				type: '1次中转',
				class: '基础经济舱',
				departure: '北京',
				arrival: '上海',
				aircraft: '空客A320',
				terminal: 'T2',
				gate: 'E35',
				punctualityRate: 85,
			},
			{
				id: '6',
				flightNumber: 'CA2468',
				airline: '中国国际航空',
				departureTime: '14:30',
				arrivalTime: '17:45',
				duration: '3小时15分钟',
				price: 2180,
				type: '直飞',
				class: '商务舱',
				departure: '深圳',
				arrival: '北京',
				aircraft: '波音737-800',
				terminal: 'T3',
				gate: 'A28',
				punctualityRate: 93,
			},
			{
				id: '7',
				flightNumber: 'MU1357',
				airline: '中国东方航空',
				departureTime: '11:20',
				arrivalTime: '15:50',
				duration: '4小时30分钟',
				price: 1680,
				type: '直飞',
				class: '经济舱',
				departure: '广州',
				arrival: '杭州',
				aircraft: '空客A321',
				terminal: 'T2',
				gate: 'B17',
				punctualityRate: 89,
			},
			{
				id: '8',
				flightNumber: 'CZ8642',
				airline: '中国南方航空',
				departureTime: '16:40',
				arrivalTime: '20:15',
				duration: '3小时35分钟',
				price: 1450,
				type: '直飞',
				class: '经济舱',
				departure: '深圳',
				arrival: '武汉',
				aircraft: '波音737-800',
				terminal: 'T3',
				gate: 'C22',
				punctualityRate: 91,
			},
		];

		// 根据搜索关键词筛选航班
		const lowerSearchText = searchText.toLowerCase();
		const filteredFlights = allMockFlights.filter((flight) => {
			return (
				flight.airline.toLowerCase().includes(lowerSearchText) ||
				flight.departure.toLowerCase().includes(lowerSearchText) ||
				flight.arrival.toLowerCase().includes(lowerSearchText) ||
				flight.flightNumber.toLowerCase().includes(lowerSearchText) ||
				flight.type.toLowerCase().includes(lowerSearchText) ||
				flight.class.toLowerCase().includes(lowerSearchText) ||
				flight.aircraft.toLowerCase().includes(lowerSearchText)
			);
		});

		// 添加选择状态
		const flights = filteredFlights.map((flight) => {
			return assign({}, flight, {
				selected: selectedIds.includes(flight.id) || false,
			});
		});

		const selectedFlights = flights.filter((f) => f.selected);

		this.setData({
			flights: flights,
			selectedFlights: selectedFlights,
		});

		getApp().globalData.selectedFlights = selectedFlights;

		if (flights.length > 0) {
			wx.showToast({
				title: `找到 ${flights.length} 个航班`,
				icon: 'success',
			});
		} else {
			wx.showToast({
				title: '未找到匹配的航班',
				icon: 'none',
			});
		}
	},
});
