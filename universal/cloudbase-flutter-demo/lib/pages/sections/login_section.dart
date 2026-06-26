// 登录表单组件
//
// 该组件用于展示 CloudBase 的四种登录方式，供用户选择并填写登录信息：
// - 匿名登录 (loginType=0)：无需填写任何信息，系统自动创建临时账户
// - 密码登录 (loginType=1)：通过用户名/邮箱/手机号 + 密码登录
// - 手机验证码登录 (loginType=2)：输入手机号 → 发送验证码 → 输入验证码登录
// - 邮箱验证码登录 (loginType=3)：输入邮箱 → 发送验证码 → 输入验证码登录
//
// 手机和邮箱登录采用两步流程：先发送验证码（OTP），成功后显示验证码输入框，
// 用户输入验证码后完成登录。
//
// 使用方式：
// ```dart
// LoginSection(
//   loginType: _loginType,                           // 当前选择的登录方式
//   onLoginTypeChanged: (type) => setState(() => _loginType = type),
//   isLoading: _isLoading,                           // 是否正在加载
//   isOtpSent: _isOtpSent,                           // 验证码是否已发送
//   obscurePassword: _obscurePassword,               // 密码是否遮挡
//   onToggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
//   errorMessage: _errorMessage,                     // 错误提示文本
//   successMessage: _successMessage,                 // 成功提示文本
//   usernameController: _usernameController,
//   passwordController: _passwordController,
//   phoneController: _phoneController,
//   emailController: _emailController,
//   otpController: _otpController,
//   onSignInAnonymously: _signInAnonymously,         // 匿名登录回调
//   onSignInWithPassword: _signInWithPassword,       // 密码登录回调
//   onSendPhoneOtp: _sendPhoneOtp,                   // 发送手机验证码回调
//   onSendEmailOtp: _sendEmailOtp,                   // 发送邮箱验证码回调
//   onVerifyOtp: _verifyOtp,                         // 验证 OTP 并登录回调
//   onResetOtp: _resetOtpState,                      // 重置验证码状态回调
// );
// ```
import 'package:flutter/material.dart';

/// 登录表单组件，展示 CloudBase 四种登录方式的切换与输入界面。
///
/// 这是一个无状态组件（StatelessWidget），所有状态（包括验证码发送状态、
/// 密码可见性等）均由父组件管理，通过构造函数传入。
class LoginSection extends StatelessWidget {
  /// 当前选择的登录方式：0=匿名, 1=密码, 2=手机, 3=邮箱
  final int loginType;

  /// 当用户切换登录方式时的回调
  final ValueChanged<int> onLoginTypeChanged;

  /// 是否正在加载中，为 true 时所有按钮禁用
  final bool isLoading;

  /// 验证码是否已发送（用于手机和邮箱登录的两步流程）
  final bool isOtpSent;

  /// 密码是否遮挡显示
  final bool obscurePassword;

  /// 切换密码可见性的回调
  final VoidCallback onToggleObscure;

  /// 错误提示信息，非 null 时显示红色提示卡片
  final String? errorMessage;

  /// 成功提示信息，非 null 时显示绿色提示卡片
  final String? successMessage;

  /// 用户名/邮箱/手机号输入控制器（密码登录模式使用）
  final TextEditingController usernameController;

  /// 密码输入控制器
  final TextEditingController passwordController;

  /// 手机号输入控制器
  final TextEditingController phoneController;

  /// 邮箱输入控制器
  final TextEditingController emailController;

  /// 验证码（OTP）输入控制器
  final TextEditingController otpController;

  /// 匿名登录按钮回调
  final VoidCallback onSignInAnonymously;

  /// 密码登录按钮回调
  final VoidCallback onSignInWithPassword;

  /// 发送手机验证码按钮回调
  final VoidCallback onSendPhoneOtp;

  /// 发送邮箱验证码按钮回调
  final VoidCallback onSendEmailOtp;

  /// 验证 OTP 并完成登录的回调
  final VoidCallback onVerifyOtp;

  /// 重置验证码状态的回调（回到"发送验证码"步骤）
  final VoidCallback onResetOtp;

  const LoginSection({
    super.key,
    required this.loginType,
    required this.onLoginTypeChanged,
    required this.isLoading,
    required this.isOtpSent,
    required this.obscurePassword,
    required this.onToggleObscure,
    required this.errorMessage,
    required this.successMessage,
    required this.usernameController,
    required this.passwordController,
    required this.phoneController,
    required this.emailController,
    required this.otpController,
    required this.onSignInAnonymously,
    required this.onSignInWithPassword,
    required this.onSendPhoneOtp,
    required this.onSendEmailOtp,
    required this.onVerifyOtp,
    required this.onResetOtp,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          // 页面顶部 Logo 图标
          const Icon(Icons.cloud, size: 80, color: Colors.blue),
          const SizedBox(height: 16),
          // 页面标题
          Text(
            'CloudBase 登录',
            style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // 登录方式选择器（四个 FilterChip）
          _buildLoginTypeSelector(),
          const SizedBox(height: 24),

          // 错误/成功提示卡片
          if (errorMessage != null) _buildMessageCard(context, errorMessage!, Colors.red),
          if (successMessage != null) _buildMessageCard(context, successMessage!, Colors.green),

          // 根据选择的登录方式，带动画切换显示对应的表单
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: _buildLoginContent(),
          ),
        ],
      ),
    );
  }

  /// 构建登录方式选择器 —— 四个 FilterChip 横向排列
  Widget _buildLoginTypeSelector() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        _buildLoginTypeChip(0, Icons.person_outline, '匿名'),
        _buildLoginTypeChip(1, Icons.password, '密码'),
        _buildLoginTypeChip(2, Icons.phone, '手机'),
        _buildLoginTypeChip(3, Icons.email, '邮箱'),
      ],
    );
  }

  /// 构建单个登录方式选择 Chip
  ///
  /// [type] 登录方式编号，[icon] 图标，[label] 显示文字
  Widget _buildLoginTypeChip(int type, IconData icon, String label) {
    final isSelected = loginType == type;
    return FilterChip(
      selected: isSelected,
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 4),
          Text(label),
        ],
      ),
      onSelected: (_) => onLoginTypeChanged(type),
    );
  }

  /// 根据当前 loginType 返回对应的登录表单内容
  Widget _buildLoginContent() {
    switch (loginType) {
      case 0:
        return _buildAnonymousLogin();
      case 1:
        return _buildPasswordLogin();
      case 2:
        return _buildPhoneLogin();
      case 3:
        return _buildEmailLogin();
      default:
        return const SizedBox.shrink();
    }
  }

  /// 构建匿名登录界面 —— 信息提示 + 一键登录按钮
  Widget _buildAnonymousLogin() {
    return Column(
      key: const ValueKey('anonymous'),
      children: [
        // 匿名登录说明提示框
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  '匿名登录无需提供任何信息，系统将为您创建临时账户。',
                  style: TextStyle(color: Colors.blue),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        _buildPrimaryButton(
          onPressed: onSignInAnonymously,
          icon: Icons.login,
          label: '匿名登录',
        ),
      ],
    );
  }

  /// 构建密码登录界面 —— 用户名/邮箱/手机号输入 + 密码输入 + 登录按钮
  Widget _buildPasswordLogin() {
    return Column(
      key: const ValueKey('password'),
      children: [
        // 用户名/邮箱/手机号输入框（三合一）
        TextField(
          controller: usernameController,
          decoration: const InputDecoration(
            labelText: '用户名/邮箱/手机号',
            hintText: '请输入用户名、邮箱或手机号',
            prefixIcon: Icon(Icons.person),
            border: OutlineInputBorder(),
          ),
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        // 密码输入框（支持切换明文/密文）
        TextField(
          controller: passwordController,
          obscureText: obscurePassword,
          decoration: InputDecoration(
            labelText: '密码',
            hintText: '请输入密码',
            prefixIcon: const Icon(Icons.lock),
            border: const OutlineInputBorder(),
            suffixIcon: IconButton(
              icon: Icon(obscurePassword ? Icons.visibility_off : Icons.visibility),
              onPressed: onToggleObscure,
            ),
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => onSignInWithPassword(),
        ),
        const SizedBox(height: 24),
        _buildPrimaryButton(
          onPressed: onSignInWithPassword,
          icon: Icons.login,
          label: '登录',
        ),
      ],
    );
  }

  /// 构建手机验证码登录界面
  ///
  /// 分为两步：
  /// 1. 输入手机号 → 点击"发送验证码"
  /// 2. 验证码已发送后 → 输入验证码 → 点击"验证并登录"
  Widget _buildPhoneLogin() {
    return Column(
      key: const ValueKey('phone'),
      children: [
        // 手机号输入框 —— 验证码已发送后禁用编辑
        TextField(
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: '手机号',
            hintText: '请输入手机号',
            prefixIcon: Icon(Icons.phone),
            border: OutlineInputBorder(),
          ),
          enabled: !isOtpSent,
        ),
        const SizedBox(height: 16),
        if (isOtpSent) ...[
          // 验证码输入框（验证码已发送后显示）
          TextField(
            controller: otpController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: '验证码',
              hintText: '请输入验证码',
              prefixIcon: Icon(Icons.pin),
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onVerifyOtp(),
          ),
          const SizedBox(height: 16),
          // "重新输入" + "验证并登录"按钮组
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: isLoading ? null : onResetOtp,
                  child: const Text('重新输入'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 2,
                child: _buildPrimaryButton(
                  onPressed: onVerifyOtp,
                  label: '验证并登录',
                  showIcon: false,
                ),
              ),
            ],
          ),
        ] else
          // 发送验证码按钮（验证码未发送时显示）
          _buildPrimaryButton(
            onPressed: onSendPhoneOtp,
            icon: Icons.send,
            label: '发送验证码',
          ),
      ],
    );
  }

  /// 构建邮箱验证码登录界面
  ///
  /// 流程与手机验证码登录相同，仅输入框从手机号变为邮箱
  Widget _buildEmailLogin() {
    return Column(
      key: const ValueKey('email'),
      children: [
        // 邮箱输入框 —— 验证码已发送后禁用编辑
        TextField(
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: '邮箱',
            hintText: '请输入邮箱地址',
            prefixIcon: Icon(Icons.email),
            border: OutlineInputBorder(),
          ),
          enabled: !isOtpSent,
        ),
        const SizedBox(height: 16),
        if (isOtpSent) ...[
          // 验证码输入框
          TextField(
            controller: otpController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: '验证码',
              hintText: '请输入验证码',
              prefixIcon: Icon(Icons.pin),
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => onVerifyOtp(),
          ),
          const SizedBox(height: 16),
          // "重新输入" + "验证并登录"按钮组
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: isLoading ? null : onResetOtp,
                  child: const Text('重新输入'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 2,
                child: _buildPrimaryButton(
                  onPressed: onVerifyOtp,
                  label: '验证并登录',
                  showIcon: false,
                ),
              ),
            ],
          ),
        ] else
          // 发送验证码按钮
          _buildPrimaryButton(
            onPressed: onSendEmailOtp,
            icon: Icons.send,
            label: '发送验证码',
          ),
      ],
    );
  }

  /// 构建主操作按钮（通用）
  ///
  /// [onPressed] 点击回调，[icon] 图标，[label] 按钮文字，
  /// [showIcon] 是否显示图标（验证并登录按钮不需要图标）。
  /// 加载中时按钮禁用并显示 CircularProgressIndicator。
  Widget _buildPrimaryButton({
    required VoidCallback onPressed,
    IconData? icon,
    required String label,
    bool showIcon = true,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : (showIcon && icon != null ? Icon(icon) : const SizedBox.shrink()),
        label: isLoading ? const Text('处理中...') : Text(label),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  /// 构建错误/成功提示卡片
  ///
  /// [message] 提示文字，[color] 主题色（红色=错误，绿色=成功）
  Widget _buildMessageCard(BuildContext context, String message, MaterialColor color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.shade200),
      ),
      child: Row(
        children: [
          Icon(
            color == Colors.green ? Icons.check_circle : Icons.error,
            color: color.shade700,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: TextStyle(color: color.shade700)),
          ),
        ],
      ),
    );
  }
}
