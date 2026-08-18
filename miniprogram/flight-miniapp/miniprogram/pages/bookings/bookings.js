Page({
	data: {
		bookings: [],
		loading: false,
	},

	onLoad() {
		this.loadBookings();
	},

	onShow() {
		// 每次显示页面时重新加载预订信息
		this.loadBookings();
	},

	async loadBookings() {
		this.setData({ loading: true });

		try {
			const result = await wx.cloud.callFunction({
				name: 'getBookings',
			});

			if (result.result.success) {
				// 处理预订数据，确保格式正确
				const bookings = result.result.bookings.map((booking) => {
					return {
						...booking,
						// 格式化日期
						bookingDate: this.formatDate(
							booking.bookingTime || booking.createTime
						),
						// 格式化价格
						displayPrice: `¥${booking.totalPrice}`,
						// 格式化航线
						route: `${booking.flight.departure} → ${booking.flight.arrival}`,
						// 状态显示
						statusText: booking.status === 'confirmed' ? '已确认' : '待确认',
					};
				});
				this.setData({ bookings });
			} else {
				console.log('获取预订失败，使用模拟数据');
				this.loadMockBookings();
			}
		} catch (error) {
			console.error('获取预订信息失败:', error);
			this.loadMockBookings();
		}

		this.setData({ loading: false });
	},

	loadMockBookings() {
		const mockBookings = [
			{
				_id: 'mock1',
				bookingNumber: 'BK12345678001',
				flight: {
					flightNumber: 'CA1234',
					airline: '中国国际航空',
					departure: '北京',
					arrival: '上海',
					departureTime: '08:00',
					arrivalTime: '13:30',
					type: '直飞',
					class: '经济舱',
				},
				totalPrice: 1350,
				status: 'confirmed',
				bookingDate: '2024-01-15',
				route: '北京 → 上海',
				displayPrice: '¥1350',
				statusText: '已确认',
				passengers: [{ name: '张三', type: 'adult' }],
			},
			{
				_id: 'mock2',
				bookingNumber: 'BK12345678002',
				flight: {
					flightNumber: 'MU5678',
					airline: '中国东方航空',
					departure: '上海',
					arrival: '深圳',
					departureTime: '09:00',
					arrivalTime: '12:15',
					type: '直飞',
					class: '商务舱',
				},
				totalPrice: 2550,
				status: 'pending',
				bookingDate: '2024-01-20',
				route: '上海 → 深圳',
				displayPrice: '¥2550',
				statusText: '待确认',
				passengers: [
					{ name: '李四', type: 'adult' },
					{ name: '李小明', type: 'child' },
				],
			},
		];

		this.setData({ bookings: mockBookings });
	},

	// 格式化日期
	formatDate(dateString) {
		if (!dateString) return '';
		const date = new Date(dateString);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
			2,
			'0'
		)}-${String(date.getDate()).padStart(2, '0')}`;
	},

	// 查看预订详情
	viewBookingDetails(e) {
		const bookingId = e.currentTarget.dataset.bookingId;
		const booking = this.data.bookings.find((b) => b._id === bookingId);

		if (!booking) {
			wx.showToast({
				title: '找不到预订信息',
				icon: 'none',
			});
			return;
		}

		// 构建详情内容
		const passengerInfo = booking.passengers
			? booking.passengers
					.map(
						(p) =>
							`${p.name} (${
								p.type === 'adult'
									? '成人'
									: p.type === 'child'
									? '儿童'
									: '婴儿'
							})`
					)
					.join('、')
			: '暂无乘客信息';

		const content = `预订号：${booking.bookingNumber || '暂无'}
航班：${booking.flight.airline} ${booking.flight.flightNumber}
航线：${booking.route}
时间：${booking.flight.departureTime} - ${booking.flight.arrivalTime}
舱位：${booking.flight.class}
乘客：${passengerInfo}
总价：${booking.displayPrice}
状态：${booking.statusText}`;

		wx.showModal({
			title: '预订详情',
			content: content,
			showCancel: false,
		});
	},

	// 取消预订
	cancelBooking(e) {
		const bookingId = e.currentTarget.dataset.bookingId;
		const booking = this.data.bookings.find((b) => b._id === bookingId);

		if (!booking) {
			wx.showToast({
				title: '找不到预订信息',
				icon: 'none',
			});
			return;
		}

		wx.showModal({
			title: '取消预订',
			content: `确定要取消预订 ${booking.flight.airline} ${booking.flight.flightNumber} 吗？`,
			success: (res) => {
				if (res.confirm) {
					wx.showToast({
						title: '取消预订功能暂未开放',
						icon: 'none',
					});
				}
			},
		});
	},

	// 下拉刷新
	onPullDownRefresh() {
		this.loadBookings().then(() => {
			wx.stopPullDownRefresh();
		});
	},
});
