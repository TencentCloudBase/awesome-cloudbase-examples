// 云函数（Cloud Function）测试卡片组件
//
// 该组件用于测试 CloudBase 云函数的调用功能（cloudBase.callFunction）。
// 用户可以在界面上填写云函数名称和请求数据（JSON），然后点击按钮发起调用，
// 调用结果会显示在下方的灰色区域中。
//
// 云函数是 CloudBase 提供的 Serverless 计算能力，开发者只需编写函数代码
// 并部署到云端，即可通过 SDK 直接调用，无需维护服务器。
//
// 使用方式：
// ```dart
// CloudFunctionSection(
//   functionNameController: _functionNameController,   // 函数名输入控制器
//   functionDataController: _functionDataController,   // 请求数据输入控制器
//   isLoading: _isLoading,
//   result: _functionResult,
//   onTest: _testCallFunction,
// );
// ```
import 'package:flutter/material.dart';

/// 云函数测试卡片，展示 callFunction 调用的表单界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态均由父组件管理。
/// 相比云托管，云函数的调用更为简单，只需要函数名和可选的请求数据。
class CloudFunctionSection extends StatelessWidget {
  /// 云函数名称输入控制器，对应 CloudBase 控制台中创建的函数名
  final TextEditingController functionNameController;

  /// 请求数据输入控制器，需要填写 JSON 格式字符串，将作为函数的入参
  final TextEditingController functionDataController;

  /// 是否正在加载中，为 true 时按钮禁用
  final bool isLoading;

  /// 调用结果文本，为 null 时不显示结果区域
  final String? result;

  /// 点击"调用 callFunction"按钮时触发的回调
  final VoidCallback onTest;

  const CloudFunctionSection({
    super.key,
    required this.functionNameController,
    required this.functionDataController,
    required this.isLoading,
    required this.result,
    required this.onTest,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 卡片标题
            Text(
              '云函数测试',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const Divider(),
            const SizedBox(height: 8),

            // 函数名称输入框 —— 在 CloudBase 控制台「云函数」中创建的函数名
            TextField(
              controller: functionNameController,
              decoration: const InputDecoration(
                labelText: '函数名称',
                hintText: '例如: test',
                prefixIcon: Icon(Icons.functions),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // 请求数据输入框（JSON 格式，作为云函数的 event 参数）
            TextField(
              controller: functionDataController,
              decoration: const InputDecoration(
                labelText: '请求数据 (JSON)',
                hintText: '例如: {"a": 1}',
                prefixIcon: Icon(Icons.data_object),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 12),

            // 调用按钮 —— 加载中时禁用
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onTest,
                icon: const Icon(Icons.cloud_circle),
                label: const Text('调用 callFunction'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),

            // 结果展示区域 —— 仅在有结果时显示
            if (result != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SelectableText(
                  result!,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
