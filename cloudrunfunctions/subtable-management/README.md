# 子表管理云函数

这个云函数用于处理主表与子表数据之间的关系管理，自动处理子表数据的增删改操作，并更新主表中对子表数据的引用。

## 功能

* 自动对比子表数据变化，确定需要进行的增删改操作
* 执行子表数据的批量增删改
* 更新主表中对子表数据的引用关系

## 入参说明

| 参数 | 类型 | 描述 |
|------|------|------|
| mainName | string | 主表名称 |
| subCode | string | 子表在主表中的字段编码 |
| subName | string | 子表名称 |
| mainData | object | 主表数据对象 |
| subData | array | 子表当前数据数组 |
| subOldData | array | 子表原始数据数组 |

## 返回值

```javascript
{
    success: true,
    message: '数据处理成功',
    details: {
        subRes: [], // 子表操作结果
        res: {} // 主表操作结果
    }
}
```

## 使用示例

可视化使用示例, 具体请参考：[子表单场景指南](https://docs.cloudbase.net/lowcode/practices/database-guide/sub-table)

```js
async () => {
    const res = await $w.cloud.callFunction({
        name: 'subTable-management', // TCB 云函数名称
        data: {
            mainName: 'categories',
            subCode: 'splb',
            subName: 'products',
            mainData: {
                ...$w.form1.value,
                _id: $w.page.dataset.params._id
            },
            subData: $w.form1.value.splb || [],
            subOldData: $w.form1.remoteValue.splb || [],
        },
    });
    console.log(res)
};
```
