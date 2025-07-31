Page({
	data: {
		flight: null,
		passengers: [
			{
				id: 1,
				name: '',
				idCard: '',
				phone: '',
				type: 'adult', // adult, child, infant
			},
		],
		contactInfo: {
			name: '',
			phone: '',
			email: '',
		},
		totalPrice: 0,
		loading: false,
		showAddPassenger: false,
		passengerTypes: [
			{ value: 'adult', label: '成人' },
			{ value: 'child', label: '儿童' },
			{ value: 'infant', label: '婴儿' },
		],
	},

	onLoad(options) {
		console.log('预订页面参数:', options);

		if (options.flightData) {
			try {
				const flight = JSON.parse(decodeURIComponent(options.flightData));
				this.setData({
					flight: flight,
					totalPrice: flight.price,
				});
				console.log('航班信息:', flight);
			} catch (error) {
				console.error('解析航班数据失败:', error);
				wx.showToast({
					title: '航班信息错误',
					icon: 'none',
				});
				setTimeout(() => {
					wx.navigateBack();
				}, 1500);
			}
		} else {
			wx.showToast({
				title: '缺少航班信息',
				icon: 'none',
			});
			setTimeout(() => {
				wx.navigateBack();
			}, 1500);
		}
	},

	// 返回上一页
	goBack() {
		wx.navigateBack();
	},

	// 乘客信息输入
	onPassengerNameInput(e) {
		const index = e.currentTarget.dataset.index;
		const passengers = this.data.passengers;
		passengers[index].name = e.detail.value;
		this.setData({ passengers });
	},

	onPassengerIdCardInput(e) {
		const index = e.currentTarget.dataset.index;
		const passengers = this.data.passengers;
		passengers[index].idCard = e.detail.value;
		this.setData({ passengers });
	},

	onPassengerPhoneInput(e) {
		const index = e.currentTarget.dataset.index;
		const passengers = this.data.passengers;
		passengers[index].phone = e.detail.value;
		this.setData({ passengers });
	},

	// 乘客类型选择
	onPassengerTypeChange(e) {
		const index = e.currentTarget.dataset.index;
		const typeIndex = e.detail.value;
		const passengers = this.data.passengers;
		passengers[index].type = this.data.passengerTypes[typeIndex].value;
		this.setData({ passengers });
		this.calculateTotalPrice();
	},

	// 联系人信息输入
	onContactNameInput(e) {
		this.setData({
			'contactInfo.name': e.detail.value,
		});
	},

	onContactPhoneInput(e) {
		this.setData({
			'contactInfo.phone': e.detail.value,
		});
	},

	onContactEmailInput(e) {
		this.setData({
			'contactInfo.email': e.detail.value,
		});
	},

	// 添加乘客
	addPassenger() {
		if (this.data.passengers.length >= 9) {
			wx.showToast({
				title: '最多只能添加9名乘客',
				icon: 'none',
			});
			return;
		}

		const newPassenger = {
			id: Date.now(),
			name: '',
			idCard: '',
			phone: '',
			type: 'adult',
		};

		const passengers = [...this.data.passengers, newPassenger];
		this.setData({ passengers });
		this.calculateTotalPrice();
	},

	// 删除乘客
	removePassenger(e) {
		const index = e.currentTarget.dataset.index;

		if (this.data.passengers.length <= 1) {
			wx.showToast({
				title: '至少需要一名乘客',
				icon: 'none',
			});
			return;
		}

		const passengers = this.data.passengers.filter((_, i) => i !== index);
		this.setData({ passengers });
		this.calculateTotalPrice();
	},

	// 计算总价
	calculateTotalPrice() {
		const basePrice = this.data.flight ? this.data.flight.price : 0;
		let totalPrice = 0;

		this.data.passengers.forEach((passenger) => {
			switch (passenger.type) {
				case 'adult':
					totalPrice += basePrice;
					break;
				case 'child':
					totalPrice += basePrice * 0.75; // 儿童75%
					break;
				case 'infant':
					totalPrice += basePrice * 0.1; // 婴儿10%
					break;
			}
		});

		this.setData({ totalPrice: Math.round(totalPrice) });
	},

	// 验证表单
	validateForm() {
		// 验证乘客信息
		for (let i = 0; i < this.data.passengers.length; i++) {
			const passenger = this.data.passengers[i];
			if (!passenger.name.trim()) {
				wx.showToast({
					title: `请填写第${i + 1}位乘客姓名`,
					icon: 'none',
				});
				return false;
			}
			if (!passenger.idCard.trim()) {
				wx.showToast({
					title: `请填写第${i + 1}位乘客身份证号`,
					icon: 'none',
				});
				return false;
			}
			if (!passenger.phone.trim()) {
				wx.showToast({
					title: `请填写第${i + 1}位乘客手机号`,
					icon: 'none',
				});
				return false;
			}
		}

		// 验证联系人信息
		if (!this.data.contactInfo.name.trim()) {
			wx.showToast({
				title: '请填写联系人姓名',
				icon: 'none',
			});
			return false;
		}
		if (!this.data.contactInfo.phone.trim()) {
			wx.showToast({
				title: '请填写联系人手机号',
				icon: 'none',
			});
			return false;
		}

		return true;
	},

	// 提交预订
	async submitBooking() {
		if (!this.validateForm()) {
			return;
		}

		this.setData({ loading: true });

		try {
			// 构建预订数据
			const bookingData = {
				flight: this.data.flight,
				passengers: this.data.passengers,
				contactInfo: this.data.contactInfo,
				totalPrice: this.data.totalPrice,
				bookingTime: new Date().toISOString(),
				status: 'confirmed',
			};

			console.log('提交预订数据:', bookingData);

			// 调用云函数保存预订信息
			const result = await wx.cloud.callFunction({
				name: 'createBooking',
				data: bookingData,
			});

			if (result.result && result.result.success) {
				wx.showToast({
					title: '预订成功！',
					icon: 'success',
				});

				// 跳转到预订确认页面或预订列表
				setTimeout(() => {
					wx.switchTab({
						url: '/pages/bookings/bookings',
					});
				}, 1500);
			} else {
				throw new Error(result.result ? result.result.error : '预订失败');
			}
		} catch (error) {
			console.error('预订失败:', error);
			wx.showToast({
				title: '预订失败，请重试',
				icon: 'none',
			});
		}

		this.setData({ loading: false });
	},
});
