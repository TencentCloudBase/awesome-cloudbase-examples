const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();

	try {
		const { flight, passengers, contactInfo, totalPrice, bookingTime, status } =
			event;

		// 验证必要字段
		if (!flight || !passengers || !contactInfo) {
			return {
				success: false,
				error: '缺少必要的预订信息',
			};
		}

		// 生成预订号
		const bookingNumber = generateBookingNumber();

		// 构建预订数据
		const bookingData = {
			bookingNumber: bookingNumber,
			openid: wxContext.OPENID,
			flight: {
				id: flight.id,
				flightNumber: flight.flightNumber,
				airline: flight.airline,
				departure: flight.departure,
				arrival: flight.arrival,
				departureTime: flight.departureTime,
				arrivalTime: flight.arrivalTime,
				duration: flight.duration,
				price: flight.price,
				type: flight.type,
				class: flight.class,
				aircraft: flight.aircraft,
				terminal: flight.terminal,
				gate: flight.gate,
			},
			passengers: passengers.map((passenger) => ({
				name: passenger.name,
				idCard: passenger.idCard,
				phone: passenger.phone,
				type: passenger.type,
			})),
			contactInfo: {
				name: contactInfo.name,
				phone: contactInfo.phone,
				email: contactInfo.email || '',
			},
			totalPrice: totalPrice,
			bookingTime: bookingTime || new Date().toISOString(),
			status: status || 'confirmed',
			createTime: new Date(),
			updateTime: new Date(),
		};

		console.log('保存预订数据:', bookingData);

		// 保存到数据库
		const result = await db.collection('bookings').add({
			data: bookingData,
		});

		console.log('预订保存结果:', result);

		return {
			success: true,
			bookingId: result._id,
			bookingNumber: bookingNumber,
			message: '预订成功',
		};
	} catch (error) {
		console.error('创建预订失败:', error);
		return {
			success: false,
			error: error.message || '预订失败，请重试',
		};
	}
};

// 生成预订号
function generateBookingNumber() {
	const timestamp = Date.now().toString();
	const random = Math.floor(Math.random() * 1000)
		.toString()
		.padStart(3, '0');
	return `BK${timestamp.slice(-8)}${random}`;
}
