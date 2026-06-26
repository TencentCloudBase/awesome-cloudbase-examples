// 云托管（CloudBase Run）测试卡片组件
//
// 该组件用于测试 CloudBase 云托管服务的调用功能（cloudBase.callContainer）。
// 用户可以在界面上填写云托管服务名称、请求方法、请求路径和请求数据（JSON），
// 然后点击按钮发起调用，调用结果会显示在下方的灰色区域中。
//
// 云托管是 CloudBase 提供的容器化托管服务，允许开发者部署后端服务并通过
// SDK 直接调用，无需关心域名和证书配置。
//
// 使用方式：
// ```dart
// CloudRunSection(
//   containerNameController: _containerNameController,   // 服务名称输入控制器
//   containerPathController: _containerPathController,   // 请求路径输入控制器
//   containerDataController: _containerDataController,   // 请求数据输入控制器
//   containerMethod: _containerMethod,                   // 当前 HTTP 请求方法
//   onMethodChanged: (v) => setState(() => _containerMethod = v),
//   isLoading: _isLoading,
//   result: _cloudRunResult,
//   onTest: _testCallContainer,
// );
// ```
import 'package:flutter/material.dart';
import 'package:cloudbase_flutter/cloudbase_flutter.dart';

/// 云托管测试卡片，展示 callContainer 调用的表单界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态均由父组件管理。
/// [HttpMethod] 来自 `cloudbase_flutter` SDK，表示 HTTP 请求方法枚举。
class CloudRunSection extends StatelessWidget {
  /// 云托管服务名称输入控制器，对应 CloudBase 控制台中创建的服务名
  final TextEditingController containerNameController;

  /// 请求路径输入控制器，如 "/api/test"
  final TextEditingController containerPathController;

  /// 请求体数据输入控制器，需要填写 JSON 格式字符串
  final TextEditingController containerDataController;

  /// 当前选中的 HTTP 请求方法（GET / POST / PUT / DELETE）
  final HttpMethod containerMethod;

  /// 当用户切换请求方法时的回调
  final ValueChanged<HttpMethod> onMethodChanged;

  /// 是否正在加载中，为 true 时按钮禁用
  final bool isLoading;

  /// 调用结果文本，为 null 时不显示结果区域
  final String? result;

  /// 点击"调用 callContainer"按钮时触发的回调
  final VoidCallback onTest;

  const CloudRunSection({
    super.key,
    required this.containerNameController,
    required this.containerPathController,
    required this.containerDataController,
    required this.containerMethod,
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
              '云托管测试',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const Divider(),
            const SizedBox(height: 8),

            // 服务名称输入框 —— 在 CloudBase 控制台「云托管」中创建的服务名称
            TextField(
              controller: containerNameController,
              decoration: const InputDecoration(
                labelText: '服务名称',
                hintText: '例如: helloworld',
                prefixIcon: Icon(Icons.dns),
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),

            // 请求方法 + 请求路径（横向排列）
            Row(
              children: [
                // HTTP 方法下拉选择，使用 SDK 提供的 HttpMethod 枚举
                Expanded(
                  child: DropdownButtonFormField<HttpMethod>(
                    value: containerMethod,
                    decoration: const InputDecoration(
                      labelText: '请求方法',
                      prefixIcon: Icon(Icons.http),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE]
                        .map((m) => DropdownMenuItem(
                              value: m,
                              child: Text(m.name.toUpperCase()),
                            ))
                        .toList(),
                    onChanged: (v) => onMethodChanged(v!),
                  ),
                ),
                const SizedBox(width: 12),
                // 请求路径输入
                Expanded(
                  child: TextField(
                    controller: containerPathController,
                    decoration: const InputDecoration(
                      labelText: '请求路径',
                      hintText: '例如: /api/test',
                      prefixIcon: Icon(Icons.link),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 请求体数据输入框（JSON 格式）
            TextField(
              controller: containerDataController,
              decoration: const InputDecoration(
                labelText: '请求数据 (JSON)',
                hintText: '例如: {"key": "value"}',
                prefixIcon: Icon(Icons.data_object),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),

            // 调用按钮 —— 加载中时禁用
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onTest,
                icon: const Icon(Icons.cloud_upload),
                label: const Text('调用 callContainer'),
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
