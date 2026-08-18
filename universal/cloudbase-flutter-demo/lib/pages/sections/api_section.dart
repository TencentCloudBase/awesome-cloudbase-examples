// API 测试卡片组件
//
// 该组件用于测试 CloudBase 的 API 代理功能（cloudBase.apis[name]）。
// 用户可以在界面上填写 API 名称、请求方法、请求路径和请求数据（JSON），
// 然后点击按钮发起调用，调用结果会显示在下方的灰色区域中。
//
// 使用方式：
// ```dart
// ApiSection(
//   apiNameController: _apiNameController,   // API 名称输入框控制器
//   apiPathController: _apiPathController,   // 请求路径输入框控制器
//   apiDataController: _apiDataController,   // 请求数据输入框控制器
//   apiMethod: _apiMethod,                   // 当前选择的请求方法 (GET/POST/PUT/DELETE/PATCH)
//   onMethodChanged: (v) => setState(() => _apiMethod = v),
//   isLoading: _isLoading,                   // 是否正在加载中
//   result: _apiResult,                      // 调用结果文本
//   onTest: _testCallApi,                    // 点击"调用 API"按钮的回调
// );
// ```
import 'package:flutter/material.dart';

/// API 测试卡片，展示 API 代理调用的表单界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态均由父组件管理，
/// 通过构造函数传入控制器和回调来实现交互。
class ApiSection extends StatelessWidget {
  /// API 名称输入控制器，对应 CloudBase 控制台中配置的 API 标识
  final TextEditingController apiNameController;

  /// 请求路径输入控制器，如 "/" 或 "/users"
  final TextEditingController apiPathController;

  /// 请求体数据输入控制器，需要填写 JSON 格式字符串
  final TextEditingController apiDataController;

  /// 当前选中的 HTTP 请求方法，如 "GET"、"POST" 等
  final String apiMethod;

  /// 当用户切换请求方法时的回调
  final ValueChanged<String> onMethodChanged;

  /// 是否正在加载中，为 true 时按钮禁用
  final bool isLoading;

  /// 调用结果文本，为 null 时不显示结果区域
  final String? result;

  /// 点击"调用 API"按钮时触发的回调
  final VoidCallback onTest;

  const ApiSection({
    super.key,
    required this.apiNameController,
    required this.apiPathController,
    required this.apiDataController,
    required this.apiMethod,
    required this.onMethodChanged,
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
              'API 测试',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const Divider(),
            const SizedBox(height: 8),

            // API 名称输入框 —— 对应 CloudBase 控制台配置的 API 标识
            TextField(
              controller: apiNameController,
              decoration: const InputDecoration(
                labelText: 'API 名称',
                hintText: '例如: txydx_vth7h68',
                prefixIcon: Icon(Icons.api),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // 请求方法 + 请求路径（横向排列）
            Row(
              children: [
                // HTTP 方法下拉选择
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: apiMethod,
                    decoration: const InputDecoration(
                      labelText: '请求方法',
                      prefixIcon: Icon(Icons.http),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                        .map((m) => DropdownMenuItem(
                              value: m,
                              child: Text(m),
                            ))
                        .toList(),
                    onChanged: (v) => onMethodChanged(v!),
                  ),
                ),
                const SizedBox(width: 12),
                // 请求路径输入
                Expanded(
                  child: TextField(
                    controller: apiPathController,
                    decoration: const InputDecoration(
                      labelText: '请求路径',
                      hintText: '例如: /',
                      prefixIcon: Icon(Icons.link),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 请求体数据输入框（JSON 格式，支持多行输入）
            TextField(
              controller: apiDataController,
              decoration: const InputDecoration(
                labelText: '请求数据 (JSON)',
                hintText: '例如: {"key": "value"}',
                prefixIcon: Icon(Icons.data_object),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 5,
            ),
            const SizedBox(height: 12),

            // 调用按钮 —— 加载中时禁用
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onTest,
                icon: const Icon(Icons.send),
                label: const Text('调用 API'),
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
