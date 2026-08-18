const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
	env: cloudbase.SYMBOL_CURRENT_ENV,
});
const models = app.models;

/**
 * 处理主表与子表数据关系
 * @param {string} mainName - 主表名称
 * @param {string} subCode - 子表在主表中的编码
 * @param {string} subName - 子表名称
 * @param {object} mainData - 主表数据
 * @param {array} subData - 子表当前数据
 * @param {array} subOldData - 子表源数据
 * @returns {Promise<object>} 处理结果
 */
exports.main = async function ({ mainName, subCode, subName, mainData, subData, subOldData }) {
	try {
		// 1. 对比子表数据，获取增删改操作
		const { addData, updateData, deleteIds } = diffSubData(subData, subOldData);

		// 2. 执行子表数据的增删改操作
		const subRes = await executeSubTableOperations(subName, addData, updateData, deleteIds);

		console.log('更新子表完毕', JSON.stringify(subRes, null, 2));

		// 3. 获取子表ids
		const addRes = subRes.find((it) => it.type === 'add');
		const delRes = subRes.find((it) => it.type === 'delete');

		const subIds = mainData[subCode]
			.map((it) => it._id)
			.filter((i) => !delRes || !delRes.data?.data?.legalIdList.includes(i))
			.concat(addRes ? addRes.data?.data?.idList : [])
			.map((it) => ({ _id: it }));

		// 3. 更新主表数据
		const data = {
			...mainData,
			[subCode]: subIds,
		};
		const res = mainData._id
			? await models[mainName].update({
					data,
					filter: {
						where: {
							_id: {
								$eq: mainData._id,
							},
						},
					},
			  })
			: await models[mainName].create({
					data,
			  });

		return {
			success: true,
			message: '数据处理成功',
			details: {
				subRes,
				res,
			},
		};
	} catch (error) {
		console.error('数据处理失败:', error);
		throw new Error(`数据处理失败: ${error.message}`);
	}
};

/**
 * 对比子表数据，获取增删改操作
 * @param {array} currentData - 当前子表数据
 * @param {array} sourceData - 源子表数据
 * @returns {object} 包含新增、更新和删除的数据
 */
function diffSubData(currentData, sourceData) {
	// 提取新旧数据的ID集合
	const newIds = currentData.filter((item) => item._id).map((item) => item._id);
	const oldIds = sourceData.map((item) => item._id);

	// 确定需要删除的数据ID（旧有但新数据中没有）
	const deleteIds = oldIds.filter((id) => !newIds.includes(id));

	// 确定需要新增的数据（没有_id的记录）
	const addData = currentData.filter((item) => !item._id && Object.keys(item).length > 1);

	// 确定需要更新的数据（有_id且存在于旧数据中）
	const updateData = currentData
		.filter((item) => item._id && oldIds.includes(item._id))
		.map((item) => {
			// 找到旧数据，只更新有变化的字段
			const oldItem = sourceData.find((old) => old._id === item._id);
			const updateFields = {};

			// 对比所有字段，记录变化的部分
			Object.keys(item).forEach((key) => {
				if (key !== '_id' && item[key] !== oldItem[key]) {
					updateFields[key] = item[key];
				}
			});

			return {
				_id: item._id,
				...updateFields,
			};
		})
		// 过滤掉没有实际修改的记录
		.filter((item) => Object.keys(item).length > 1); // 大于1是因为至少有_id字段

	return { addData, updateData, deleteIds };
}

/**
 * 执行子表数据的增删改操作
 * @param {string} subName - 子表名称
 * @param {array} addData - 新增数据
 * @param {array} updateData - 更新数据
 * @param {array} deleteIds - 删除数据ID列表
 * @returns {Promise<object>} 操作结果
 */
async function executeSubTableOperations(subName, addData, updateData, deleteIds) {
	const model = models[subName];
	const operations = [];

	// 执行新增操作
	if (addData.length > 0) {
		operations.push(
			model
				.createMany({
					data: addData,
				})
				.then((res) => ({
					type: 'add',
					data: res,
				}))
		);
		console.log('需要新增的数据', addData);
	}

	// 执行删除操作
	if (deleteIds.length > 0) {
		operations.push(
			model
				.deleteMany({
					filter: {
						where: {
							_id: {
								$in: deleteIds,
							},
						},
					},
				})
				.then((res) => ({
					type: 'delete',
					data: res,
				}))
		);
		console.log('需要删除的数据', deleteIds);
	}

	// 执行更新操作
	if (updateData.length > 0) {
		updateData.forEach((item) => {
			operations.push(
				model
					.update({
						data: item,
						filter: {
							where: {
								_id: {
									$eq: item._id,
								},
							},
						},
					})
					.then((res) => ({
						type: 'edit',
						data: res,
					}))
			);
		});
		console.log('需要更新的数据', updateData);
	}

	return Promise.all(operations);
}
