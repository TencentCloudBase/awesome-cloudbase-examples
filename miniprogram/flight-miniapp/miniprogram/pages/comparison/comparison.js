const { assign } = require('../../utils/util.js');

Page({
	data: {
		flights: [],
		comparisonItems: [
			{ key: 'price', label: '价格', unit: '¥' },
			{ key: 'duration', label: '飞行时长', unit: '' },
			{ key: 'type', label: '航班类型', unit: '' },
			{ key: 'class', label: '舱位等级', unit: '' },
			{ key: 'aircraft', label: '机型', unit: '' },
			{ key: 'terminal', label: '航站楼', unit: '' },
			{ key: 'gate', label: '登机口', unit: '' },
			{ key: 'punctualityRate', label: '准点率', unit: '%' },
		],
		comparisonData: [], // 预处理的对比数据
	},

	onLoad(options) {
		console.log('对比页面加载，全局数据：', getApp().globalData);

		// 获取传递的航班数据
		const selectedFlights = getApp().globalData.selectedFlights || [];

		console.log('选中的航班数据：', selectedFlights);

		if (selectedFlights.length === 0) {
			wx.showToast({
				title: '没有选择的航班',
				icon: 'none',
			});
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
			return;
		}

		if (selectedFlights.length < 2) {
			wx.showToast({
				title: '请至少选择两个航班进行对比',
				icon: 'none',
			});
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
			return;
		}

		// 确保数据完整性，补充缺失的字段
		const processedFlights = selectedFlights.map((flight) => {
			return assign({}, flight, {
				aircraft: flight.aircraft || '未知机型',
				terminal: flight.terminal || '未知航站楼',
				gate: flight.gate || '未知登机口',
				punctualityRate: flight.punctualityRate || 85,
			});
		});

		// 预处理对比数据
		const comparisonData = this.processComparisonData(processedFlights);

		this.setData({
			flights: processedFlights,
			comparisonData: comparisonData,
		});

		console.log('设置的航班数据：', processedFlights);
		console.log('对比数据：', comparisonData);
	},

	// 预处理对比数据
	processComparisonData(flights) {
		const comparisonData = [];

		this.data.comparisonItems.forEach((item) => {
			const rowData = {
				key: item.key,
				label: item.label,
				values: [],
			};

			flights.forEach((flight, flightIndex) => {
				const displayValue = this.getDisplayValue(flight, item);
				const comparisonClass = this.getComparisonClass(
					item,
					flightIndex,
					flights
				);

				rowData.values.push({
					value: displayValue,
					class: comparisonClass,
				});
			});

			comparisonData.push(rowData);
		});

		return comparisonData;
	},

	// 返回上一页
	goBack() {
		wx.navigateBack();
	},

	// 选择航班
	selectFlight(e) {
		const flightId = e.currentTarget.dataset.flightId;
		const flight = this.data.flights.find((f) => f.id === flightId);

		if (!flight) {
			wx.showToast({
				title: '航班信息错误',
				icon: 'none',
			});
			return;
		}

		wx.showModal({
			title: '选择航班',
			content: `您选择了 ${flight.airline} ${flight.flightNumber}，是否前往预订？`,
			success: (res) => {
				if (res.confirm) {
					// 跳转到预订页面，传递航班信息
					const flightData = encodeURIComponent(JSON.stringify(flight));
					wx.navigateTo({
						url: `/pages/booking/booking?flightData=${flightData}`,
					});
				}
			},
		});
	},

	// 获取对比值的样式类
	getComparisonClass(item, flightIndex, flights) {
		if (!flights || flights.length === 0 || !flights[flightIndex]) {
			return '';
		}

		if (item.key === 'price') {
			// 价格最低的标绿色
			const prices = flights.map((f) => Number(f.price) || 0);
			const minPrice = Math.min(...prices);
			return Number(flights[flightIndex].price) === minPrice
				? 'best-value'
				: '';
		} else if (item.key === 'punctualityRate') {
			// 准点率最高的标绿色
			const rates = flights.map((f) => Number(f.punctualityRate) || 0);
			const maxRate = Math.max(...rates);
			return Number(flights[flightIndex].punctualityRate) === maxRate
				? 'best-value'
				: '';
		} else if (item.key === 'type') {
			// 直飞标绿色
			return flights[flightIndex].type === '直飞' ? 'best-value' : '';
		}
		return '';
	},

	// 获取显示值
	getDisplayValue(flight, item) {
		if (!flight || !item) {
			return '未知';
		}

		const value = flight[item.key];

		if (value === undefined || value === null) {
			return '未知';
		}

		if (item.key === 'price') {
			return `${item.unit}${value}`;
		} else if (item.key === 'punctualityRate') {
			return `${value}${item.unit}`;
		}
		return String(value);
	},
});
