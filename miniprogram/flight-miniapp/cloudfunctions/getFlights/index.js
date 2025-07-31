const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();

	try {
		const {
			departure,
			arrival,
			startDate,
			endDate,
			includeBasicFares,
			nonstopFlights,
			searchText,
		} = event;

		// 构建查询条件
		let query = {};

		if (departure) {
			query.departure = new RegExp(departure, 'i');
		}

		if (arrival) {
			query.arrival = new RegExp(arrival, 'i');
		}

		if (nonstopFlights) {
			query.type = '直飞';
		}

		// 添加搜索文本支持
		if (searchText) {
			const searchRegex = new RegExp(searchText, 'i');
			query.$or = [
				{ airline: searchRegex },
				{ departure: searchRegex },
				{ arrival: searchRegex },
				{ flightNumber: searchRegex },
				{ type: searchRegex },
				{ class: searchRegex },
				{ aircraft: searchRegex },
			];
		}

		// 查询航班数据
		const result = await db.collection('flights').where(query).get();

		let flights = result.data;

		console.log('查询到的原始数据:', flights.length, '条');

		// 将 _id 转换为 id 字段
		flights = flights.map((flight) => {
			const newFlight = {
				...flight,
				id: flight._id, // 将 _id 作为 id 使用
				selected: false, // 添加默认的 selected 字段
			};
			// 删除原来的 _id 字段以避免冗余
			delete newFlight._id;
			return newFlight;
		});

		console.log(
			'转换后的数据示例:',
			flights[0] ? Object.keys(flights[0]) : 'no data'
		);

		// 如果没有真实数据，返回模拟数据
		if (flights.length === 0) {
			console.log('使用模拟数据');
			flights = generateMockFlights(
				departure,
				arrival,
				includeBasicFares,
				nonstopFlights,
				searchText
			);
		}

		// 根据是否包含基础票价进行过滤
		if (!includeBasicFares) {
			flights = flights.filter((flight) => flight.class !== '基础经济舱');
		}

		// 按价格排序
		flights.sort((a, b) => a.price - b.price);

		return {
			success: true,
			flights: flights,
			openid: wxContext.OPENID,
			appid: wxContext.APPID,
			unionid: wxContext.UNIONID,
		};
	} catch (error) {
		console.error('获取航班数据失败:', error);

		// 返回模拟数据作为备用
		const flights = generateMockFlights(
			event.departure,
			event.arrival,
			event.includeBasicFares,
			event.nonstopFlights,
			event.searchText
		);

		return {
			success: true,
			flights: flights,
			error: error.message,
		};
	}
};

// 生成模拟航班数据
function generateMockFlights(
	departure,
	arrival,
	includeBasicFares,
	nonstopFlights,
	searchText
) {
	const airlines = [
		'中国国际航空',
		'中国东方航空',
		'中国南方航空',
		'海南航空',
		'厦门航空',
		'深圳航空',
		'四川航空',
		'山东航空',
		'春秋航空',
		'吉祥航空',
	];

	const flightTypes = nonstopFlights
		? ['直飞']
		: ['直飞', '1次中转', '2次中转'];
	const flightClasses = includeBasicFares
		? ['经济舱', '商务舱', '头等舱', '基础经济舱']
		: ['经济舱', '商务舱', '头等舱'];

	// 默认城市
	const defaultDeparture = departure || '北京';
	const defaultArrival = arrival || '上海';

	const flights = [];

	for (let i = 0; i < 8; i++) {
		const departureHour = Math.floor(Math.random() * 18) + 6; // 6-23点
		const departureMinute = Math.floor(Math.random() * 60);
		const flightDuration = Math.floor(Math.random() * 8) + 2; // 2-10小时
		const arrivalHour = (departureHour + flightDuration) % 24;
		const arrivalMinute = Math.floor(Math.random() * 60);

		const airline = airlines[Math.floor(Math.random() * airlines.length)];
		const type = flightTypes[Math.floor(Math.random() * flightTypes.length)];
		const flightClass =
			flightClasses[Math.floor(Math.random() * flightClasses.length)];

		let basePrice = 800;
		if (flightClass === '商务舱') basePrice = 2500;
		else if (flightClass === '头等舱') basePrice = 4500;
		else if (flightClass === '基础经济舱') basePrice = 600;

		if (type === '1次中转') basePrice += 200;
		else if (type === '2次中转') basePrice += 400;

		const price = basePrice + Math.floor(Math.random() * 500);

		const formatTime = (hour, minute) => {
			return `${hour.toString().padStart(2, '0')}:${minute
				.toString()
				.padStart(2, '0')}`;
		};

		// 生成航班号
		const flightNumber = generateFlightNumber(airline);

		flights.push({
			id: `flight_${i + 1}`,
			flightNumber: flightNumber,
			airline: airline,
			departureTime: formatTime(departureHour, departureMinute),
			arrivalTime: formatTime(arrivalHour, arrivalMinute),
			duration: `${flightDuration}小时${Math.floor(Math.random() * 60)}分钟`,
			price: price,
			type: type,
			class: flightClass,
			departure: defaultDeparture,
			arrival: defaultArrival,
			selected: false,
			// 添加更多详细信息用于对比
			aircraft: getRandomAircraft(),
			terminal: getRandomTerminal(),
			gate: getRandomGate(),
			punctualityRate: Math.floor(Math.random() * 20) + 80, // 80-99%
		});
	}

	// 如果有搜索文本，进行过滤
	if (searchText) {
		const lowerSearchText = searchText.toLowerCase();
		return flights.filter((flight) => {
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
	}

	return flights;
}

// 生成航班号
function generateFlightNumber(airline) {
	const airlineCodes = {
		中国国际航空: 'CA',
		中国东方航空: 'MU',
		中国南方航空: 'CZ',
		海南航空: 'HU',
		厦门航空: 'MF',
		深圳航空: 'ZH',
		四川航空: '3U',
		山东航空: 'SC',
		春秋航空: '9C',
		吉祥航空: 'HO',
	};

	const code = airlineCodes[airline] || 'XX';
	const number = Math.floor(Math.random() * 9000) + 1000;
	return `${code}${number}`;
}

// 获取随机机型
function getRandomAircraft() {
	const aircrafts = [
		'波音737-800',
		'波音777-300ER',
		'空客A320',
		'空客A330-300',
		'空客A350-900',
		'波音787-9',
		'空客A321',
		'波音737 MAX 8',
	];
	return aircrafts[Math.floor(Math.random() * aircrafts.length)];
}

// 获取随机航站楼
function getRandomTerminal() {
	const terminals = ['T1', 'T2', 'T3'];
	return terminals[Math.floor(Math.random() * terminals.length)];
}

// 获取随机登机口
function getRandomGate() {
	const gateLetters = ['A', 'B', 'C', 'D', 'E'];
	const gateLetter =
		gateLetters[Math.floor(Math.random() * gateLetters.length)];
	const gateNumber = Math.floor(Math.random() * 50) + 1;
	return `${gateLetter}${gateNumber.toString().padStart(2, '0')}`;
}
