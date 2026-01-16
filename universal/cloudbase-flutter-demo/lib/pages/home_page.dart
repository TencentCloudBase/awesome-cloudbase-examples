import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloudbase_flutter/cloudbase_flutter.dart';

/// 全局 Navigator Key（用于验证码弹窗）
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  CloudBase? _cloudBase;
  bool _isLoading = false;
  bool _isLoggedIn = false;
  String? _errorMessage;
  String? _successMessage;
  User? _currentUser;
  String? _cloudRunResult;
  String? _functionResult;
  String? _apiResult;

  // 云托管测试参数控制器
  final _containerNameController = TextEditingController(text: 'ibot-yr');
  final _containerPathController = TextEditingController(text: '/');
  final _containerDataController = TextEditingController(text: '{"key1": "value1"}');
  HttpMethod _containerMethod = HttpMethod.GET;

  // 云函数测试参数控制器
  final _functionNameController = TextEditingController(text: 'test');
  final _functionDataController = TextEditingController(text: '{"a": 1}');

  // API 测试参数控制器
  final _apiNameController = TextEditingController(text: 'txydx_vth7h68');
  final _apiPathController = TextEditingController(text: '/');
  final _apiDataController = TextEditingController(text: '''{
  "ProductName": "sms",
  "Action": "DescribePhoneNumberInfo",
  "Version": "2021-01-11",
  "PhoneNumberSet": ["+8615910519600"],
  "Region": "ap-guangzhou"
}''');
  String _apiMethod = 'POST';

  // 登录方式: 0-匿名, 1-用户名密码, 2-手机号验证码, 3-邮箱验证码
  int _loginType = 0;

  // 表单控制器
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();

  // OTP 验证回调
  Future<SignInRes> Function(VerifyOtpParams)? _verifyOtpCallback;
  bool _isOtpSent = false;
  bool _obscurePassword = true;

  // 环境配置
  final _envIdController = TextEditingController();
  final _accessKeyController = TextEditingController();
  bool _isConfigured = false;

  @override
  void initState() {
    super.initState();
    _initCloudBase();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _otpController.dispose();
    _containerNameController.dispose();
    _containerPathController.dispose();
    _containerDataController.dispose();
    _functionNameController.dispose();
    _functionDataController.dispose();
    _apiNameController.dispose();
    _apiPathController.dispose();
    _apiDataController.dispose();
    _envIdController.dispose();
    _accessKeyController.dispose();
    super.dispose();
  }

  Future<void> _initCloudBase() async {
    // 不自动初始化，等待用户配置
    setState(() => _isLoading = false);
  }

  Future<void> _initWithConfig() async {
    final envId = _envIdController.text.trim();
    final accessKey = _accessKeyController.text.trim();

    if (envId.isEmpty) {
      _showError('请输入云开发环境 ID');
      return;
    }

    setState(() => _isLoading = true);
    _clearMessages();

    try {
      _cloudBase = await CloudBase.init(
        env: envId,
        accessKey: accessKey,
        captchaConfig: CaptchaConfig(navigatorKey: navigatorKey),
      );

      // 检查是否已登录
      final session = await _cloudBase!.auth.getSession();
      
      if (session.isSuccess && session.data?.session != null) {
        setState(() {
          _isLoggedIn = true;
          _currentUser = session.data?.user;
        });
      }

      setState(() => _isConfigured = true);
      _showSuccess('CloudBase 初始化成功');
    } catch (e) {
      setState(() => _errorMessage = '初始化失败: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _clearMessages() {
    setState(() {
      _errorMessage = null;
      _successMessage = null;
    });
  }

  void _setLoading(bool loading) {
    setState(() => _isLoading = loading);
  }

  void _showError(String message) {
    setState(() => _errorMessage = message);
  }

  void _showSuccess(String message) {
    setState(() => _successMessage = message);
  }

  // 匿名登录
  Future<void> _signInAnonymously() async {
    if (_cloudBase == null) return;

    _clearMessages();
    _setLoading(true);

    try {
      final result = await _cloudBase!.auth.signInAnonymously();
      if (result.isSuccess) {
        setState(() {
          _isLoggedIn = true;
          _currentUser = result.data?.user;
        });
        _showSuccess('匿名登录成功');
      } else {
        _showError(result.error?.message ?? '登录失败');
      }
    } catch (e) {
      _showError('登录异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 用户名密码登录
  Future<void> _signInWithPassword() async {
    if (_cloudBase == null) return;

    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty) {
      _showError('请输入用户名/邮箱/手机号');
      return;
    }
    if (password.isEmpty) {
      _showError('请输入密码');
      return;
    }

    _clearMessages();
    _setLoading(true);

    try {
      // 判断输入类型
      final isEmail = username.contains('@');
      final isPhone = RegExp(r'^\d{11}$').hasMatch(username) || 
                      RegExp(r'^\+\d{1,3}\s?\d+$').hasMatch(username);

      final result = await _cloudBase!.auth.signInWithPassword(
        SignInWithPasswordReq(
          username: (!isEmail && !isPhone) ? username : null,
          email: isEmail ? username : null,
          phone: isPhone ? username : null,
          password: password,
        ),
      );

      if (result.isSuccess) {
        setState(() {
          _isLoggedIn = true;
          _currentUser = result.data?.user;
        });
        _showSuccess('登录成功');
        _usernameController.clear();
        _passwordController.clear();
      } else {
        _showError(result.error?.message ?? '登录失败');
      }
    } catch (e) {
      _showError('登录异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 发送手机验证码
  Future<void> _sendPhoneOtp() async {
    if (_cloudBase == null) return;

    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _showError('请输入手机号');
      return;
    }

    _clearMessages();
    _setLoading(true);

    try {
      final result = await _cloudBase!.auth.signInWithOtp(
        SignInWithOtpReq(phone: phone),
      );
      if (result.isSuccess && result.data?.verifyOtp != null) {
        setState(() {
          _isOtpSent = true;
          _verifyOtpCallback = result.data!.verifyOtp;
        });
        _showSuccess('验证码已发送');
      } else {
        _showError(result.error?.message ?? '发送验证码失败');
      }
    } catch (e) {
      _showError('发送验证码异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 发送邮箱验证码
  Future<void> _sendEmailOtp() async {
    if (_cloudBase == null) return;

    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showError('请输入邮箱');
      return;
    }

    _clearMessages();
    _setLoading(true);

    try {
      final result = await _cloudBase!.auth.signInWithOtp(
        SignInWithOtpReq(email: email),
      );
      if (result.isSuccess && result.data?.verifyOtp != null) {
        setState(() {
          _isOtpSent = true;
          _verifyOtpCallback = result.data!.verifyOtp;
        });
        _showSuccess('验证码已发送到邮箱');
      } else {
        _showError(result.error?.message ?? '发送验证码失败');
      }
    } catch (e) {
      _showError('发送验证码异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 验证 OTP
  Future<void> _verifyOtp() async {
    if (_verifyOtpCallback == null) return;

    final otp = _otpController.text.trim();
    if (otp.isEmpty) {
      _showError('请输入验证码');
      return;
    }

    _clearMessages();
    _setLoading(true);

    try {
      final result = await _verifyOtpCallback!(VerifyOtpParams(token: otp));
      if (result.isSuccess) {
        setState(() {
          _isLoggedIn = true;
          _currentUser = result.data?.user;
          _isOtpSent = false;
          _verifyOtpCallback = null;
        });
        _showSuccess('登录成功');
      } else {
        _showError(result.error?.message ?? '验证失败');
      }
    } catch (e) {
      _showError('验证异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 登出
  Future<void> _signOut() async {
    if (_cloudBase == null) return;

    _clearMessages();
    _setLoading(true);

    try {
      await _cloudBase!.auth.signOut();
      setState(() {
        _isLoggedIn = false;
        _currentUser = null;
        _isOtpSent = false;
        _verifyOtpCallback = null;
      });
      _showSuccess('已退出登录');
      _clearAllInputs();
    } catch (e) {
      _showError('登出异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 刷新用户信息
  Future<void> _refreshUser() async {
    if (_cloudBase == null) return;

    _clearMessages();
    _setLoading(true);

    try {
      final result = await _cloudBase!.auth.refreshUser();
      if (result.isSuccess) {
        setState(() => _currentUser = result.data?.user);
        _showSuccess('用户信息已刷新');
      } else {
        _showError(result.error?.message ?? '刷新失败');
      }
    } catch (e) {
      _showError('刷新异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 测试云托管调用
  Future<void> _testCallContainer() async {
    if (_cloudBase == null) return;

    final name = _containerNameController.text.trim();
    if (name.isEmpty) {
      _showError('请输入服务名称');
      return;
    }

    _clearMessages();
    setState(() => _cloudRunResult = null);
    _setLoading(true);

    try {
      Map<String, dynamic>? data;
      final dataText = _containerDataController.text.trim();
      if (dataText.isNotEmpty) {
        try {
          data = jsonDecode(dataText) as Map<String, dynamic>;
        } catch (e) {
          _showError('请求数据 JSON 格式错误');
          _setLoading(false);
          return;
        }
      }

      final result = await _cloudBase!.callContainer(
        name: name,
        method: _containerMethod,
        path: _containerPathController.text.trim(),
        data: data,
      );

      if (result.isSuccess) {
        setState(() => _cloudRunResult = result.result?.toString() ?? '无返回数据');
        _showSuccess('云托管调用成功');
      } else {
        setState(() => _cloudRunResult = '错误: ${result.message}');
        _showError(result.message ?? '调用失败');
      }
    } catch (e) {
      setState(() => _cloudRunResult = '异常: $e');
      _showError('云托管调用异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 测试云函数调用
  Future<void> _testCallFunction() async {
    if (_cloudBase == null) return;

    final name = _functionNameController.text.trim();
    if (name.isEmpty) {
      _showError('请输入函数名称');
      return;
    }

    _clearMessages();
    setState(() => _functionResult = null);
    _setLoading(true);

    try {
      Map<String, dynamic>? data;
      final dataText = _functionDataController.text.trim();
      if (dataText.isNotEmpty) {
        try {
          data = jsonDecode(dataText) as Map<String, dynamic>;
        } catch (e) {
          _showError('请求数据 JSON 格式错误');
          _setLoading(false);
          return;
        }
      }

      final result = await _cloudBase!.callFunction(
        name: name,
        data: data,
      );

      if (result.isSuccess) {
        setState(() => _functionResult = result.result?.toString() ?? '无返回数据');
        _showSuccess('云函数调用成功');
      } else {
        setState(() => _functionResult = '错误: ${result.message}');
        _showError(result.message ?? '调用失败');
      }
    } catch (e) {
      setState(() => _functionResult = '异常: $e');
      _showError('云函数调用异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // 测试 API 调用
  Future<void> _testCallApi() async {
    if (_cloudBase == null) return;

    final name = _apiNameController.text.trim();
    if (name.isEmpty) {
      _showError('请输入 API 名称');
      return;
    }

    _clearMessages();
    setState(() => _apiResult = null);
    _setLoading(true);

    try {
      Map<String, dynamic>? body;
      final dataText = _apiDataController.text.trim();
      if (dataText.isNotEmpty) {
        try {
          body = jsonDecode(dataText) as Map<String, dynamic>;
        } catch (e) {
          _showError('请求数据 JSON 格式错误');
          _setLoading(false);
          return;
        }
      }

      final apiProxy = _cloudBase!.apis[name];
      ApiResponse result;

      switch (_apiMethod) {
        case 'GET':
          result = await apiProxy.get(path: _apiPathController.text.trim());
        case 'POST':
          result = await apiProxy.post(
            path: _apiPathController.text.trim(),
            body: body,
          );
        case 'PUT':
          result = await apiProxy.put(
            path: _apiPathController.text.trim(),
            body: body,
          );
        case 'DELETE':
          result = await apiProxy.delete(
            path: _apiPathController.text.trim(),
            body: body,
          );
        default:
          result = await apiProxy.post(
            path: _apiPathController.text.trim(),
            body: body,
          );
      }

      if (result.isSuccess) {
        setState(() => _apiResult = result.data?.toString() ?? '无返回数据');
        _showSuccess('API 调用成功');
      } else {
        setState(() => _apiResult = '错误: ${result.message}');
        _showError(result.message ?? '调用失败');
      }
    } catch (e) {
      setState(() => _apiResult = '异常: $e');
      _showError('API 调用异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  void _clearAllInputs() {
    _usernameController.clear();
    _passwordController.clear();
    _phoneController.clear();
    _emailController.clear();
    _otpController.clear();
  }

  void _resetOtpState() {
    setState(() {
      _isOtpSent = false;
      _verifyOtpCallback = null;
      _otpController.clear();
    });
    _clearMessages();
  }

  @override
  Widget build(BuildContext context) {
    // 未配置环境时显示配置界面
    if (!_isConfigured) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('CloudBase 配置'),
          backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        ),
        body: _buildConfigForm(),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isLoggedIn ? '用户中心' : '登录'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          // 重新配置按钮
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              setState(() {
                _isConfigured = false;
                _cloudBase = null;
                _isLoggedIn = false;
                _currentUser = null;
              });
            },
            tooltip: '重新配置',
          ),
          if (_isLoggedIn)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _isLoading ? null : _refreshUser,
              tooltip: '刷新用户信息',
            ),
        ],
      ),
      body: _isLoading && _cloudBase == null
          ? const Center(child: CircularProgressIndicator())
          : _isLoggedIn
              ? _buildUserInfo()
              : _buildLoginForm(),
    );
  }

  // 配置表单
  Widget _buildConfigForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 40),
          // Logo
          Icon(
            Icons.cloud_outlined,
            size: 80,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 24),
          Text(
            '腾讯云开发 CloudBase',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '请输入您的云开发环境配置',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
          const SizedBox(height: 40),

          // 错误/成功提示
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: Colors.red[700]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red[700]),
                    ),
                  ),
                ],
              ),
            ),

          // 环境 ID 输入
          TextField(
            controller: _envIdController,
            decoration: InputDecoration(
              labelText: '环境 ID (env)',
              hintText: '请输入云开发环境 ID',
              prefixIcon: const Icon(Icons.dns_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              helperText: '在云开发控制台 -> 环境 -> 环境ID 获取',
            ),
          ),
          const SizedBox(height: 20),

          // 访问密钥输入
          TextField(
            controller: _accessKeyController,
            decoration: InputDecoration(
              labelText: '访问密钥 (accessKey)',
              hintText: '请输入访问密钥',
              prefixIcon: const Icon(Icons.key_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              helperText: '在云开发控制台 -> 环境 -> 访问管理 获取',
            ),
          ),
          const SizedBox(height: 32),

          // 初始化按钮
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _initWithConfig,
              style: ElevatedButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      '初始化 CloudBase',
                      style: TextStyle(fontSize: 16),
                    ),
            ),
          ),
          const SizedBox(height: 24),

          // 帮助链接
          TextButton.icon(
            onPressed: () {
              // 可以打开帮助文档
            },
            icon: const Icon(Icons.help_outline, size: 18),
            label: const Text('如何获取环境配置？'),
          ),
        ],
      ),
    );
  }

  // 用户信息页面
  Widget _buildUserInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          const SizedBox(height: 20),
          // 头像
          CircleAvatar(
            radius: 50,
            backgroundColor: Colors.blue.shade100,
            backgroundImage: _currentUser?.userMetadata?.avatarUrl != null
                ? NetworkImage(_currentUser!.userMetadata!.avatarUrl!)
                : null,
            child: _currentUser?.userMetadata?.avatarUrl == null
                ? Icon(Icons.person, size: 50, color: Colors.blue.shade700)
                : null,
          ),
          const SizedBox(height: 16),
          // 用户名/昵称
          Text(
            _currentUser?.userMetadata?.nickName ??
                _currentUser?.userMetadata?.username ??
                _currentUser?.userMetadata?.name ??
                '用户',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          // 用户类型标签
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _currentUser?.isAnonymous == true
                  ? Colors.orange.shade100
                  : Colors.green.shade100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              _currentUser?.isAnonymous == true ? '匿名用户' : '正式用户',
              style: TextStyle(
                color: _currentUser?.isAnonymous == true
                    ? Colors.orange.shade800
                    : Colors.green.shade800,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 消息提示
          if (_successMessage != null) _buildMessageCard(_successMessage!, Colors.green),
          if (_errorMessage != null) _buildMessageCard(_errorMessage!, Colors.red),

          // 用户详细信息卡片
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '用户信息',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Divider(),
                  _buildInfoTile(Icons.badge, '用户ID', _currentUser?.id ?? '未知'),
                  if (_currentUser?.email != null)
                    _buildInfoTile(Icons.email, '邮箱', _currentUser!.email!),
                  if (_currentUser?.phone != null)
                    _buildInfoTile(Icons.phone, '手机号', _currentUser!.phone!),
                  if (_currentUser?.userMetadata?.username != null)
                    _buildInfoTile(Icons.person, '用户名', _currentUser!.userMetadata!.username!),
                  if (_currentUser?.createdAt != null)
                    _buildInfoTile(Icons.calendar_today, '创建时间', _formatDateTime(_currentUser!.createdAt!)),
                  if (_currentUser?.lastSignInAt != null)
                    _buildInfoTile(Icons.login, '最后登录', _formatDateTime(_currentUser!.lastSignInAt!)),
                  if (_currentUser?.userMetadata?.hasPassword != null)
                    _buildInfoTile(
                      Icons.lock,
                      '密码状态',
                      _currentUser!.userMetadata!.hasPassword! ? '已设置' : '未设置',
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 云托管测试卡片
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '云托管测试',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Divider(),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _containerNameController,
                    decoration: const InputDecoration(
                      labelText: '服务名称',
                      hintText: '例如: helloworld',
                      prefixIcon: Icon(Icons.dns),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<HttpMethod>(
                          value: _containerMethod,
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
                          onChanged: (v) => setState(() => _containerMethod = v!),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _containerPathController,
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
                  TextField(
                    controller: _containerDataController,
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
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isLoading ? null : _testCallContainer,
                      icon: const Icon(Icons.cloud_upload),
                      label: const Text('调用 callContainer'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  if (_cloudRunResult != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: SelectableText(
                        _cloudRunResult!,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 云函数测试卡片
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '云函数测试',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Divider(),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _functionNameController,
                    decoration: const InputDecoration(
                      labelText: '函数名称',
                      hintText: '例如: test',
                      prefixIcon: Icon(Icons.functions),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _functionDataController,
                    decoration: const InputDecoration(
                      labelText: '请求数据 (JSON)',
                      hintText: '例如: {"a": 1}',
                      prefixIcon: Icon(Icons.data_object),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isLoading ? null : _testCallFunction,
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('调用 callFunction'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  if (_functionResult != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: SelectableText(
                        _functionResult!,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // API 测试卡片
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'API 测试',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const Divider(),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _apiNameController,
                    decoration: const InputDecoration(
                      labelText: 'API 名称',
                      hintText: '例如: txydx_vth7h68',
                      prefixIcon: Icon(Icons.api),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _apiMethod,
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
                          onChanged: (v) => setState(() => _apiMethod = v!),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _apiPathController,
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
                  TextField(
                    controller: _apiDataController,
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
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isLoading ? null : _testCallApi,
                      icon: const Icon(Icons.send),
                      label: const Text('调用 API'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  if (_apiResult != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: SelectableText(
                        _apiResult!,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 退出登录按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _signOut,
              icon: const Icon(Icons.logout),
              label: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('退出登录'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.red.shade50,
                foregroundColor: Colors.red.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text('$label: ', style: const TextStyle(color: Colors.grey)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageCard(String message, MaterialColor color) {
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

  String _formatDateTime(String dateTimeStr) {
    try {
      final dt = DateTime.parse(dateTimeStr);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateTimeStr;
    }
  }

  // 登录表单
  Widget _buildLoginForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          const Icon(Icons.cloud, size: 80, color: Colors.blue),
          const SizedBox(height: 16),
          Text(
            'CloudBase 登录',
            style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // 登录方式选择
          _buildLoginTypeSelector(),
          const SizedBox(height: 24),

          // 消息提示
          if (_errorMessage != null) _buildMessageCard(_errorMessage!, Colors.red),
          if (_successMessage != null) _buildMessageCard(_successMessage!, Colors.green),

          // 根据登录方式显示不同表单
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: _buildLoginContent(),
          ),
        ],
      ),
    );
  }

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

  Widget _buildLoginTypeChip(int type, IconData icon, String label) {
    final isSelected = _loginType == type;
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
      onSelected: (_) {
        setState(() {
          _loginType = type;
          _resetOtpState();
        });
      },
    );
  }

  Widget _buildLoginContent() {
    switch (_loginType) {
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

  // 匿名登录
  Widget _buildAnonymousLogin() {
    return Column(
      key: const ValueKey('anonymous'),
      children: [
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
          onPressed: _signInAnonymously,
          icon: Icons.login,
          label: '匿名登录',
        ),
      ],
    );
  }

  // 密码登录
  Widget _buildPasswordLogin() {
    return Column(
      key: const ValueKey('password'),
      children: [
        TextField(
          controller: _usernameController,
          decoration: const InputDecoration(
            labelText: '用户名/邮箱/手机号',
            hintText: '请输入用户名、邮箱或手机号',
            prefixIcon: Icon(Icons.person),
            border: OutlineInputBorder(),
          ),
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            labelText: '密码',
            hintText: '请输入密码',
            prefixIcon: const Icon(Icons.lock),
            border: const OutlineInputBorder(),
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _signInWithPassword(),
        ),
        const SizedBox(height: 24),
        _buildPrimaryButton(
          onPressed: _signInWithPassword,
          icon: Icons.login,
          label: '登录',
        ),
      ],
    );
  }

  // 手机号登录
  Widget _buildPhoneLogin() {
    return Column(
      key: const ValueKey('phone'),
      children: [
        TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: '手机号',
            hintText: '请输入手机号',
            prefixIcon: Icon(Icons.phone),
            border: OutlineInputBorder(),
          ),
          enabled: !_isOtpSent,
        ),
        const SizedBox(height: 16),
        if (_isOtpSent) ...[
          TextField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: '验证码',
              hintText: '请输入验证码',
              prefixIcon: Icon(Icons.pin),
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _verifyOtp(),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isLoading ? null : _resetOtpState,
                  child: const Text('重新输入'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 2,
                child: _buildPrimaryButton(
                  onPressed: _verifyOtp,
                  label: '验证并登录',
                  showIcon: false,
                ),
              ),
            ],
          ),
        ] else
          _buildPrimaryButton(
            onPressed: _sendPhoneOtp,
            icon: Icons.send,
            label: '发送验证码',
          ),
      ],
    );
  }

  // 邮箱登录
  Widget _buildEmailLogin() {
    return Column(
      key: const ValueKey('email'),
      children: [
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: '邮箱',
            hintText: '请输入邮箱地址',
            prefixIcon: Icon(Icons.email),
            border: OutlineInputBorder(),
          ),
          enabled: !_isOtpSent,
        ),
        const SizedBox(height: 16),
        if (_isOtpSent) ...[
          TextField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: '验证码',
              hintText: '请输入验证码',
              prefixIcon: Icon(Icons.pin),
              border: OutlineInputBorder(),
            ),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _verifyOtp(),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isLoading ? null : _resetOtpState,
                  child: const Text('重新输入'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 2,
                child: _buildPrimaryButton(
                  onPressed: _verifyOtp,
                  label: '验证并登录',
                  showIcon: false,
                ),
              ),
            ],
          ),
        ] else
          _buildPrimaryButton(
            onPressed: _sendEmailOtp,
            icon: Icons.send,
            label: '发送验证码',
          ),
      ],
    );
  }

  Widget _buildPrimaryButton({
    required VoidCallback onPressed,
    IconData? icon,
    required String label,
    bool showIcon = true,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isLoading ? null : onPressed,
        icon: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : (showIcon && icon != null ? Icon(icon) : const SizedBox.shrink()),
        label: _isLoading ? const Text('处理中...') : Text(label),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }
}
