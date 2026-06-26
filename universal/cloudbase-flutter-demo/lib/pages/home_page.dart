// CloudBase Flutter Demo 主页面
//
// 本文件是应用的核心页面，负责以下职责：
// 1. 环境配置：引导用户输入 CloudBase 环境 ID 和 Access Key，完成 SDK 初始化
// 2. 用户认证：支持匿名登录、密码登录、手机验证码登录、邮箱验证码登录
// 3. 功能测试：登录后展示云托管、云函数、API、MySQL、数据模型五大功能的测试卡片
//
// 架构说明：
// - 业务逻辑（SDK 调用、状态管理）集中在 _HomePageState 中
// - UI 卡片拆分为独立的 StatelessWidget（位于 sections/ 目录），通过回调与主页交互
// - 各 section 组件：CloudRunSection、CloudFunctionSection、ApiSection、
//   MySqlSection、ModelsSection、LoginSection
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloudbase_flutter/cloudbase_flutter.dart';

import 'sections/cloud_run_section.dart';
import 'sections/cloud_function_section.dart';
import 'sections/api_section.dart';
import 'sections/mysql_section.dart';
import 'sections/models_section.dart';
import 'sections/login_section.dart';

/// 全局 Navigator Key
///
/// 用于 CloudBase SDK 的验证码（Captcha）弹窗，SDK 内部需要通过该 Key
/// 获取 NavigatorState 来弹出验证码对话框。需要在 MaterialApp 中设置此 Key。
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

/// 应用主页面
///
/// 页面流程：环境配置 → 登录 → 功能测试面板
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // ===========================================================================
  // CloudBase SDK 实例与全局状态
  // ===========================================================================

  /// CloudBase SDK 实例，初始化成功后赋值
  CloudBase? _cloudBase;

  /// 全局加载状态，控制按钮禁用和加载指示器
  bool _isLoading = false;

  /// 用户是否已登录
  bool _isLoggedIn = false;

  /// 当前错误提示信息（红色提示卡片）
  String? _errorMessage;

  /// 当前成功提示信息（绿色提示卡片）
  String? _successMessage;

  /// 当前登录用户信息
  User? _currentUser;

  // ===========================================================================
  // 各模块测试结果
  // ===========================================================================

  /// 云托管调用结果
  String? _cloudRunResult;

  /// 云函数调用结果
  String? _functionResult;

  /// API 代理调用结果
  String? _apiResult;

  /// MySQL 操作结果
  String? _mysqlResult;

  /// 数据模型操作结果
  String? _modelsResult;

  // ===========================================================================
  // 数据模型测试参数控制器
  // ===========================================================================

  final _modelsNameController = TextEditingController(text: 'user');
  final _modelsRecordIdController = TextEditingController();
  final _modelsFilterController = TextEditingController();
  final _modelsSelectController = TextEditingController();
  final _modelsDataController = TextEditingController();
  final _modelsPageSizeController = TextEditingController(text: '10');
  final _modelsPageNumberController = TextEditingController(text: '1');
  final _modelsOrderByController = TextEditingController();
  final _modelsSqlTemplateController = TextEditingController();
  final _modelsSqlParameterController = TextEditingController();

  // 数据源查询相关控制器
  final _datasourceIdController = TextEditingController();
  final _datasourceNameController = TextEditingController();
  final _datasourceTableNameController = TextEditingController();

  /// 当前选中的数据模型操作方法
  String _modelsMethod = 'list';

  // ===========================================================================
  // MySQL 测试参数控制器
  // ===========================================================================

  final _mysqlTableController = TextEditingController(text: 'users');
  final _mysqlSchemaController = TextEditingController();
  final _mysqlInstanceController = TextEditingController();
  final _mysqlSelectController = TextEditingController(text: '*');
  final _mysqlFiltersController = TextEditingController();
  final _mysqlLimitController = TextEditingController(text: '10');
  final _mysqlOffsetController = TextEditingController(text: '0');
  final _mysqlOrderController = TextEditingController();
  final _mysqlDataController = TextEditingController();
  /// 当前选中的 MySQL 操作方法
  String _mysqlMethod = 'query';

  // ===========================================================================
  // 云托管测试参数控制器
  // ===========================================================================

  final _containerNameController = TextEditingController(text: 'ibot-yr');
  final _containerPathController = TextEditingController(text: '/');
  final _containerDataController = TextEditingController(text: '{"key1": "value1"}');
  /// 当前选中的云托管 HTTP 请求方法
  HttpMethod _containerMethod = HttpMethod.GET;

  // ===========================================================================
  // 云函数测试参数控制器
  // ===========================================================================

  final _functionNameController = TextEditingController(text: 'test');
  final _functionDataController = TextEditingController(text: '{"a": 1}');

  // ===========================================================================
  // API 测试参数控制器
  // ===========================================================================

  final _apiNameController = TextEditingController(text: 'txydx_vth7h68');
  final _apiPathController = TextEditingController(text: '/');
  final _apiDataController = TextEditingController(text: '''{
  "ProductName": "sms",
  "Action": "DescribePhoneNumberInfo",
  "Version": "2021-01-11",
  "PhoneNumberSet": ["+8615910519600"],
  "Region": "ap-guangzhou"
}''');
  /// 当前选中的 API HTTP 请求方法
  String _apiMethod = 'POST';

  // ===========================================================================
  // 登录相关状态
  // ===========================================================================

  /// 登录方式: 0=匿名, 1=用户名密码, 2=手机号验证码, 3=邮箱验证码
  int _loginType = 0;

  /// 用户名/邮箱/手机号输入控制器（密码登录）
  final _usernameController = TextEditingController();
  /// 密码输入控制器
  final _passwordController = TextEditingController();
  /// 手机号输入控制器
  final _phoneController = TextEditingController();
  /// 邮箱输入控制器
  final _emailController = TextEditingController();
  /// 验证码（OTP）输入控制器
  final _otpController = TextEditingController();

  /// OTP 验证回调函数，由 SDK 的 signInWithOtp 返回
  /// 调用此函数并传入验证码即可完成登录
  Future<SignInRes> Function(VerifyOtpParams)? _verifyOtpCallback;

  /// 验证码是否已发送（手机/邮箱登录的第二步）
  bool _isOtpSent = false;

  /// 密码是否遮挡显示
  bool _obscurePassword = true;

  // ===========================================================================
  // 环境配置
  // ===========================================================================

  /// 云开发环境 ID 输入控制器
  final _envIdController = TextEditingController();

  /// Access Key 输入控制器（可选，用于未登录模式下的安全调用）
  final _accessKeyController = TextEditingController();

  /// 是否已完成环境配置（决定显示配置页面还是登录/功能页面）
  bool _isConfigured = false;

  @override
  void initState() {
    super.initState();
    _initCloudBase();
  }

  /// 释放所有 TextEditingController，防止内存泄漏
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
    _mysqlTableController.dispose();
    _mysqlSchemaController.dispose();
    _mysqlInstanceController.dispose();
    _mysqlSelectController.dispose();
    _mysqlFiltersController.dispose();
    _mysqlLimitController.dispose();
    _mysqlOffsetController.dispose();
    _mysqlOrderController.dispose();
    _mysqlDataController.dispose();
    _modelsNameController.dispose();
    _modelsRecordIdController.dispose();
    _modelsFilterController.dispose();
    _modelsSelectController.dispose();
    _modelsDataController.dispose();
    _modelsPageSizeController.dispose();
    _modelsPageNumberController.dispose();
    _modelsOrderByController.dispose();
    _modelsSqlTemplateController.dispose();
    _modelsSqlParameterController.dispose();
    _datasourceIdController.dispose();
    _datasourceNameController.dispose();
    _datasourceTableNameController.dispose();
    _envIdController.dispose();
    _accessKeyController.dispose();
    super.dispose();
  }

  // ===========================================================================
  // 初始化与配置
  // ===========================================================================

  /// 初始化 CloudBase —— 目前仅重置加载状态，等待用户在配置页面手动初始化
  Future<void> _initCloudBase() async {
    setState(() => _isLoading = false);
  }

  /// 根据用户输入的环境 ID 和 Access Key 初始化 CloudBase SDK
  ///
  /// 初始化成功后会自动检测当前是否有有效 session，如果有则直接进入登录态。
  /// 初始化完成后页面切换到登录/功能面板。
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

  // ===========================================================================
  // 工具方法 —— 状态管理辅助函数
  // ===========================================================================

  /// 清除错误和成功提示消息
  void _clearMessages() {
    setState(() {
      _errorMessage = null;
      _successMessage = null;
    });
  }

  /// 设置全局加载状态
  void _setLoading(bool loading) {
    setState(() => _isLoading = loading);
  }

  /// 显示错误提示
  void _showError(String message) {
    setState(() => _errorMessage = message);
  }

  /// 显示成功提示
  void _showSuccess(String message) {
    setState(() => _successMessage = message);
  }

  /// 清除所有登录表单的输入内容
  void _clearAllInputs() {
    _usernameController.clear();
    _passwordController.clear();
    _phoneController.clear();
    _emailController.clear();
    _otpController.clear();
  }

  /// 重置 OTP（验证码）状态 —— 回到"发送验证码"步骤
  void _resetOtpState() {
    setState(() {
      _isOtpSent = false;
      _verifyOtpCallback = null;
      _otpController.clear();
    });
    _clearMessages();
  }

  // ===========================================================================
  // 认证相关 —— 四种登录方式 + 登出 + 刷新用户
  // ===========================================================================

  /// 匿名登录 —— 无需任何用户输入，SDK 自动创建临时账户
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

  /// 用户名密码登录
  ///
  /// 自动识别输入内容：
  /// - 包含 "@" → 视为邮箱登录
  /// - 纯数字 11 位或以 "+" 开头 → 视为手机号登录
  /// - 其他 → 视为用户名登录
  Future<void> _signInWithPassword() async {
    if (_cloudBase == null) return;
    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    if (username.isEmpty) { _showError('请输入用户名/邮箱/手机号'); return; }
    if (password.isEmpty) { _showError('请输入密码'); return; }

    _clearMessages();
    _setLoading(true);
    try {
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
        setState(() { _isLoggedIn = true; _currentUser = result.data?.user; });
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

  /// 发送手机验证码（OTP 第一步）
  ///
  /// 成功后会保存 verifyOtp 回调函数，用于第二步验证
  Future<void> _sendPhoneOtp() async {
    if (_cloudBase == null) return;
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) { _showError('请输入手机号'); return; }
    _clearMessages();
    _setLoading(true);
    try {
      final result = await _cloudBase!.auth.signInWithOtp(SignInWithOtpReq(phone: phone));
      if (result.isSuccess && result.data?.verifyOtp != null) {
        setState(() { _isOtpSent = true; _verifyOtpCallback = result.data!.verifyOtp; });
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

  /// 发送邮箱验证码（OTP 第一步）
  Future<void> _sendEmailOtp() async {
    if (_cloudBase == null) return;
    final email = _emailController.text.trim();
    if (email.isEmpty) { _showError('请输入邮箱'); return; }
    _clearMessages();
    _setLoading(true);
    try {
      final result = await _cloudBase!.auth.signInWithOtp(SignInWithOtpReq(email: email));
      if (result.isSuccess && result.data?.verifyOtp != null) {
        setState(() { _isOtpSent = true; _verifyOtpCallback = result.data!.verifyOtp; });
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

  /// 验证码校验并完成登录（OTP 第二步）
  ///
  /// 调用第一步保存的 [_verifyOtpCallback]，传入用户输入的验证码
  Future<void> _verifyOtp() async {
    if (_verifyOtpCallback == null) return;
    final otp = _otpController.text.trim();
    if (otp.isEmpty) { _showError('请输入验证码'); return; }
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

  /// 退出登录 —— 清除所有登录状态和表单内容
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

  /// 刷新当前用户信息 —— 从服务端重新拉取最新的用户数据
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

  // ===========================================================================
  // 云托管测试 —— 调用 cloudBase.callContainer
  // ===========================================================================

  /// 调用云托管服务
  ///
  /// 读取用户输入的服务名、请求方法、路径和 JSON 数据，通过 SDK 的
  /// `callContainer` 方法发起请求，结果存入 [_cloudRunResult]。
  Future<void> _testCallContainer() async {
    if (_cloudBase == null) return;
    final name = _containerNameController.text.trim();
    if (name.isEmpty) { _showError('请输入服务名称'); return; }

    _clearMessages();
    setState(() => _cloudRunResult = null);
    _setLoading(true);
    try {
      Map<String, dynamic>? data;
      final dataText = _containerDataController.text.trim();
      if (dataText.isNotEmpty) {
        try { data = jsonDecode(dataText) as Map<String, dynamic>; }
        catch (e) { _showError('请求数据 JSON 格式错误'); _setLoading(false); return; }
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

  // ===========================================================================
  // 云函数测试 —— 调用 cloudBase.callFunction
  // ===========================================================================

  /// 调用云函数
  ///
  /// 读取用户输入的函数名和 JSON 数据，通过 SDK 的 `callFunction` 方法
  /// 发起调用，结果存入 [_functionResult]。
  Future<void> _testCallFunction() async {
    if (_cloudBase == null) return;
    final name = _functionNameController.text.trim();
    if (name.isEmpty) { _showError('请输入函数名称'); return; }

    _clearMessages();
    setState(() => _functionResult = null);
    _setLoading(true);
    try {
      Map<String, dynamic>? data;
      final dataText = _functionDataController.text.trim();
      if (dataText.isNotEmpty) {
        try { data = jsonDecode(dataText) as Map<String, dynamic>; }
        catch (e) { _showError('请求数据 JSON 格式错误'); _setLoading(false); return; }
      }
      final result = await _cloudBase!.callFunction(name: name, data: data);
      print(result);
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

  // ===========================================================================
  // API 代理测试 —— 调用 cloudBase.apis[name]
  // ===========================================================================

  /// 调用 API 代理
  ///
  /// 通过 CloudBase 的 API 代理功能，将请求转发到后端服务。
  /// 支持 GET / POST / PUT / DELETE 方法，结果存入 [_apiResult]。
  Future<void> _testCallApi() async {
    if (_cloudBase == null) return;
    final name = _apiNameController.text.trim();
    if (name.isEmpty) { _showError('请输入 API 名称'); return; }

    _clearMessages();
    setState(() => _apiResult = null);
    _setLoading(true);
    try {
      Map<String, dynamic>? body;
      final dataText = _apiDataController.text.trim();
      if (dataText.isNotEmpty) {
        try { body = jsonDecode(dataText) as Map<String, dynamic>; }
        catch (e) { _showError('请求数据 JSON 格式错误'); _setLoading(false); return; }
      }
      final apiProxy = _cloudBase!.apis[name];
      ApiResponse result;
      switch (_apiMethod) {
        case 'GET':
          result = await apiProxy.get(path: _apiPathController.text.trim());
        case 'POST':
          result = await apiProxy.post(path: _apiPathController.text.trim(), body: body);
        case 'PUT':
          result = await apiProxy.put(path: _apiPathController.text.trim(), body: body);
        case 'DELETE':
          result = await apiProxy.delete(path: _apiPathController.text.trim(), body: body);
        default:
          result = await apiProxy.post(path: _apiPathController.text.trim(), body: body);
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

  // ===========================================================================
  // MySQL 数据库测试 —— 调用 cloudBase.mysql.*
  // ===========================================================================

  /// 执行 MySQL 数据库操作
  ///
  /// 根据用户选择的操作方法（query/count/insert/update/delete），
  /// 构建对应的请求参数并调用 SDK，结果存入 [_mysqlResult]。
  Future<void> _testMySql() async {
    if (_cloudBase == null) return;
    final table = _mysqlTableController.text.trim();
    if (table.isEmpty) { _showError('请输入表名'); return; }

    _clearMessages();
    setState(() => _mysqlResult = null);
    _setLoading(true);
    try {
      final schema = _mysqlSchemaController.text.trim();
      final instance = _mysqlInstanceController.text.trim();
      final method = _mysqlMethod;

      switch (method) {
        case 'query':
          final options = MySqlQueryOptions(
            select: _mysqlSelectController.text.trim().isNotEmpty ? _mysqlSelectController.text.trim() : null,
            limit: int.tryParse(_mysqlLimitController.text.trim()),
            offset: int.tryParse(_mysqlOffsetController.text.trim()),
            order: _mysqlOrderController.text.trim().isNotEmpty ? _mysqlOrderController.text.trim() : null,
            filters: _parseFilters(_mysqlFiltersController.text.trim()),
            withCount: true,
          );
          final result = await _cloudBase!.mysql.query(
            table: table,
            schema: schema.isNotEmpty ? schema : null,
            instance: instance.isNotEmpty ? instance : null,
            options: options,
          );
          setState(() => _mysqlResult = _formatMySqlResponse(result));
          if (result.isSuccess) {
            _showSuccess('查询成功，共 ${result.data.length} 条数据${result.total != null ? '（总计 ${result.total}）' : ''}');
          } else {
            _showError(result.message ?? '查询失败');
          }
          break;

        case 'count':
          final result = await _cloudBase!.mysql.count(
            table: table,
            schema: schema.isNotEmpty ? schema : null,
            instance: instance.isNotEmpty ? instance : null,
            filters: _parseFilters(_mysqlFiltersController.text.trim()),
          );
          setState(() => _mysqlResult = 'StatusCode: ${result.statusCode}\nStatusText: ${result.statusText}\nCount: ${result.count}\nRequestId: ${result.requestId}');
          if (result.isSuccess) {
            _showSuccess('统计成功，共 ${result.count} 条');
          } else {
            _showError(result.message ?? '统计失败');
          }
          break;

        case 'insert':
          final dataText = _mysqlDataController.text.trim();
          if (dataText.isEmpty) { _showError('请输入插入数据 (JSON)'); _setLoading(false); return; }
          dynamic data;
          try { data = jsonDecode(dataText); }
          catch (e) { _showError('数据 JSON 格式错误'); _setLoading(false); return; }
          final result = await _cloudBase!.mysql.insert(
            table: table,
            schema: schema.isNotEmpty ? schema : null,
            instance: instance.isNotEmpty ? instance : null,
            data: data,
          );
          setState(() => _mysqlResult = 'StatusCode: ${result.statusCode}\nStatusText: ${result.statusText}\nSuccess: ${result.isSuccess}\nData: ${result.data}\nRequestId: ${result.requestId}');
          if (result.isSuccess) { _showSuccess('插入成功'); } else { _showError(result.message ?? '插入失败'); }
          break;

        case 'update':
          final dataText = _mysqlDataController.text.trim();
          if (dataText.isEmpty) { _showError('请输入更新数据 (JSON)'); _setLoading(false); return; }
          final filters = _parseFilters(_mysqlFiltersController.text.trim());
          if (filters == null || filters.isEmpty) { _showError('更新操作必须提供筛选条件'); _setLoading(false); return; }
          Map<String, dynamic> updateData;
          try { updateData = jsonDecode(dataText) as Map<String, dynamic>; }
          catch (e) { _showError('数据 JSON 格式错误'); _setLoading(false); return; }
          final result = await _cloudBase!.mysql.update(
            table: table,
            schema: schema.isNotEmpty ? schema : null,
            instance: instance.isNotEmpty ? instance : null,
            data: updateData,
            filters: filters,
          );
          setState(() => _mysqlResult = 'StatusCode: ${result.statusCode}\nStatusText: ${result.statusText}\nSuccess: ${result.isSuccess}\nData: ${result.data}\nRequestId: ${result.requestId}');
          if (result.isSuccess) { _showSuccess('更新成功'); } else { _showError(result.message ?? '更新失败'); }
          break;

        case 'delete':
          final filters = _parseFilters(_mysqlFiltersController.text.trim());
          if (filters == null || filters.isEmpty) { _showError('删除操作必须提供筛选条件'); _setLoading(false); return; }
          final result = await _cloudBase!.mysql.delete(
            table: table,
            schema: schema.isNotEmpty ? schema : null,
            instance: instance.isNotEmpty ? instance : null,
            filters: filters,
          );
          setState(() => _mysqlResult = 'StatusCode: ${result.statusCode}\nStatusText: ${result.statusText}\nSuccess: ${result.isSuccess}\nData: ${result.data}\nRequestId: ${result.requestId}');
          if (result.isSuccess) { _showSuccess('删除成功'); } else { _showError(result.message ?? '删除失败'); }
          break;
      }
    } catch (e) {
      setState(() => _mysqlResult = '异常: $e');
      _showError('MySQL 调用异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  /// 解析筛选条件字符串为 Map
  ///
  /// 支持两种格式：
  /// 1. JSON 格式：`{"age": "gt.18"}`
  /// 2. Key=Value 格式：`age=gt.18,name=like.%张%`
  ///
  /// 还会自动处理中文引号替换为英文引号。
  Map<String, String>? _parseFilters(String text) {
    if (text.isEmpty) return null;
    final normalized = text
        .replaceAll('\u201c', '"')
        .replaceAll('\u201d', '"')
        .replaceAll('\u2018', "'")
        .replaceAll('\u2019', "'")
        .replaceAll('\uff02', '"')
        .replaceAll('\uff07', "'");
    try {
      final decoded = jsonDecode(normalized);
      if (decoded is Map) {
        return decoded.map((k, v) => MapEntry(k.toString(), v.toString()));
      }
    } catch (_) {}
    final map = <String, String>{};
    for (final part in text.split(',')) {
      final eq = part.indexOf('=');
      if (eq > 0) {
        map[part.substring(0, eq).trim()] = part.substring(eq + 1).trim();
      }
    }
    return map.isNotEmpty ? map : null;
  }

  /// 格式化 MySQL 查询响应为可读的字符串
  String _formatMySqlResponse(MySqlResponse response) {
    final buf = StringBuffer();
    buf.writeln('StatusCode: ${response.statusCode}');
    buf.writeln('StatusText: ${response.statusText}');
    buf.writeln('Success: ${response.isSuccess}');
    buf.writeln('Total: ${response.total}');
    buf.writeln('RequestId: ${response.requestId}');
    buf.writeln('Rows: ${response.data.length}');
    for (var i = 0; i < response.data.length; i++) {
      buf.writeln('--- Row $i ---');
      buf.writeln(const JsonEncoder.withIndent('  ').convert(response.data[i]));
    }
    return buf.toString();
  }

  // ===========================================================================
  // 数据模型测试 —— 调用 cloudBase.models.*
  // ===========================================================================

  /// 解析 JSON 对象字符串，自动处理中文引号
  Map<String, dynamic>? _parseJsonInput(String text) {
    if (text.isEmpty) return null;
    final normalized = text
        .replaceAll('\u201c', '"').replaceAll('\u201d', '"')
        .replaceAll('\u2018', "'").replaceAll('\u2019', "'")
        .replaceAll('\uff02', '"').replaceAll('\uff07', "'");
    try {
      final decoded = jsonDecode(normalized);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return null;
  }

  /// 解析 JSON 数组字符串，用于 createMany 等批量操作
  List<Map<String, dynamic>>? _parseJsonArrayInput(String text) {
    if (text.isEmpty) return null;
    final normalized = text
        .replaceAll('\u201c', '"').replaceAll('\u201d', '"')
        .replaceAll('\u2018', "'").replaceAll('\u2019', "'")
        .replaceAll('\uff02', '"').replaceAll('\uff07', "'");
    try {
      final decoded = jsonDecode(normalized);
      if (decoded is List) return decoded.cast<Map<String, dynamic>>();
    } catch (_) {}
    return null;
  }

  /// 解析排序规则 JSON 数组，如 [{"createdAt": "desc"}]
  List<Map<String, String>>? _parseOrderByInput(String text) {
    if (text.isEmpty) return null;
    final normalized = text
        .replaceAll('\u201c', '"').replaceAll('\u201d', '"').replaceAll('\uff02', '"');
    try {
      final decoded = jsonDecode(normalized);
      if (decoded is List) {
        return decoded.map((e) => (e as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, v.toString()),
        )).toList();
      }
    } catch (_) {}
    return null;
  }

  /// 执行数据模型操作
  ///
  /// 根据用户选择的操作方法（list/get/create/update/delete 等共 13 种），
  /// 构建对应的请求参数并调用 SDK 的 models 接口。
  /// 结果存入 [_modelsResult]。
  Future<void> _testModels() async {
    if (_cloudBase == null) return;

    // 数据源查询操作不需要 modelName
    final isDataSourceMethod = const [
      'getAggregateDataSourceList', 'getDataSourceAggregateDetail',
      'getDataSourceByTableName', 'getBasicDataSourceList',
      'getBasicDataSource', 'getSchemaList', 'getTableName',
    ].contains(_modelsMethod);

    final modelName = _modelsNameController.text.trim();
    if (!isDataSourceMethod && _modelsMethod != 'mysqlCommand' && modelName.isEmpty) {
      _showError('请输入数据模型标识');
      return;
    }

    _clearMessages();
    setState(() => _modelsResult = null);
    _setLoading(true);

    try {
      final method = _modelsMethod;
      debugPrint('[Models] method=$method, modelName=$modelName');

      switch (method) {
        case 'getById':
          final recordId = _modelsRecordIdController.text.trim();
          if (recordId.isEmpty) { _showError('请输入记录 ID'); return; }
          final result = await _cloudBase!.models.getById(modelName: modelName, recordId: recordId);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nRecord: ${result.record}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('getById 成功');

        case 'get':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          final select = _parseJsonInput(_modelsSelectController.text.trim());
          final result = await _cloudBase!.models.get(modelName: modelName, filter: filter, select: select);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nRecord: ${result.record}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('get 成功');

        case 'list':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          final select = _parseJsonInput(_modelsSelectController.text.trim());
          final orderBy = _parseOrderByInput(_modelsOrderByController.text.trim());
          final result = await _cloudBase!.models.list(
            modelName: modelName, filter: filter, select: select,
            pageSize: int.tryParse(_modelsPageSizeController.text.trim()),
            pageNumber: int.tryParse(_modelsPageNumberController.text.trim()),
            getCount: true, orderBy: orderBy,
          );
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Total: ${result.total}')
            ..writeln('Count: ${result.records.length}')
            ..writeln('RequestId: ${result.requestId}');
          for (var i = 0; i < result.records.length; i++) {
            buf.writeln('--- Record $i ---');
            buf.writeln(const JsonEncoder.withIndent('  ').convert(result.records[i]));
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('list 成功');

        case 'listSimple':
          final result = await _cloudBase!.models.listSimple(
            modelName: modelName,
            pageSize: int.tryParse(_modelsPageSizeController.text.trim()),
            pageNumber: int.tryParse(_modelsPageNumberController.text.trim()),
            getCount: true,
          );
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Total: ${result.total}')
            ..writeln('Count: ${result.records.length}')
            ..writeln('RequestId: ${result.requestId}');
          for (var i = 0; i < result.records.length; i++) {
            buf.writeln('--- Record $i ---');
            buf.writeln(const JsonEncoder.withIndent('  ').convert(result.records[i]));
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('listSimple 成功');

        case 'create':
          final data = _parseJsonInput(_modelsDataController.text.trim());
          if (data == null) { _showError('请输入有效的 JSON 数据'); return; }
          final result = await _cloudBase!.models.create(modelName: modelName, data: data);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nId: ${result.id}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('create 成功');

        case 'createMany':
          final data = _parseJsonArrayInput(_modelsDataController.text.trim());
          if (data == null) { _showError('请输入有效的 JSON 数组数据，如 [{"name":"a"},{"name":"b"}]'); return; }
          final result = await _cloudBase!.models.createMany(modelName: modelName, data: data);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nIdList: ${result.idList}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('createMany 成功');

        case 'update':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          final data = _parseJsonInput(_modelsDataController.text.trim());
          if (filter == null) { _showError('update 需要 filter 条件'); return; }
          if (data == null) { _showError('请输入有效的更新数据'); return; }
          final result = await _cloudBase!.models.update(modelName: modelName, filter: filter, data: data);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nCount: ${result.count}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('update 成功');

        case 'updateMany':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          final data = _parseJsonInput(_modelsDataController.text.trim());
          if (filter == null) { _showError('updateMany 需要 filter 条件'); return; }
          if (data == null) { _showError('请输入有效的更新数据'); return; }
          final result = await _cloudBase!.models.updateMany(modelName: modelName, filter: filter, data: data);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nCount: ${result.count}\nLegalIdList: ${result.legalIdList}\nIllegalIdList: ${result.illegalIdList}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('updateMany 成功');

        case 'upsert':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          final data = _parseJsonInput(_modelsDataController.text.trim());
          if (filter == null) { _showError('upsert 需要 filter 条件'); return; }
          final result = await _cloudBase!.models.upsert(modelName: modelName, filter: filter, create: data, update: data);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nCount: ${result.count}\nId: ${result.id}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('upsert 成功');

        case 'deleteById':
          final recordId = _modelsRecordIdController.text.trim();
          if (recordId.isEmpty) { _showError('请输入记录 ID'); return; }
          final result = await _cloudBase!.models.deleteById(modelName: modelName, recordId: recordId);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nCount: ${result.count}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('deleteById 成功');

        case 'deleteRecord':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          if (filter == null) { _showError('deleteRecord 需要 filter 条件'); return; }
          final result = await _cloudBase!.models.deleteRecord(modelName: modelName, filter: filter);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nCount: ${result.count}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('deleteRecord 成功');

        case 'deleteMany':
          final filter = _parseJsonInput(_modelsFilterController.text.trim());
          if (filter == null) { _showError('deleteMany 需要 filter 条件'); return; }
          final result = await _cloudBase!.models.deleteMany(modelName: modelName, filter: filter);
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nCount: ${result.count}\nLegalIdList: ${result.legalIdList}\nIllegalIdList: ${result.illegalIdList}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('deleteMany 成功');

        case 'mysqlCommand':
          final sqlTemplate = _modelsSqlTemplateController.text.trim();
          if (sqlTemplate.isEmpty) { _showError('请输入 SQL 模板'); return; }
          List<ModelMysqlParameter>? parameters;
          final paramText = _modelsSqlParameterController.text.trim();
          if (paramText.isNotEmpty) {
            final paramList = _parseJsonArrayInput(paramText);
            if (paramList != null) {
              parameters = paramList.map((p) => ModelMysqlParameter(
                key: p['key']?.toString() ?? '',
                type: p['type']?.toString() ?? 'STRING',
                value: p['value']?.toString() ?? '',
              )).toList();
            }
          }
          final result = await _cloudBase!.models.mysqlCommand(sqlTemplate: sqlTemplate, parameter: parameters);
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Total: ${result.total}')
            ..writeln('BackendExecute: ${result.backendExecute}')
            ..writeln('RequestId: ${result.requestId}');
          if (result.executeResultList != null) {
            buf.writeln('Results:');
            buf.writeln(const JsonEncoder.withIndent('  ').convert(result.executeResultList));
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('mysqlCommand 成功');

        // =================================================================
        // 数据源查询操作
        // =================================================================

        case 'getAggregateDataSourceList':
          final pageSize = int.tryParse(_modelsPageSizeController.text.trim()) ?? 10;
          final pageNumber = int.tryParse(_modelsPageNumberController.text.trim()) ?? 1;
          final result = await _cloudBase!.models.getAggregateDataSourceList(
            pageSize: pageSize, pageIndex: pageNumber,
          );
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Count: ${result.count}')
            ..writeln('Rows: ${result.rows.length}')
            ..writeln('RequestId: ${result.requestId}');
          for (var i = 0; i < result.rows.length; i++) {
            final ds = result.rows[i];
            buf.writeln('--- DataSource $i ---');
            buf.writeln('  ID: ${ds.id}');
            buf.writeln('  Name: ${ds.name}');
            buf.writeln('  Title: ${ds.title}');
            buf.writeln('  Type: ${ds.type}');
            buf.writeln('  SubType: ${ds.subType}');
            buf.writeln('  Schema: ${ds.schema?.substring(0, ds.schema!.length > 100 ? 100 : ds.schema!.length)}...');
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('getAggregateDataSourceList 成功');

        case 'getDataSourceAggregateDetail':
          final dsId = _datasourceIdController.text.trim();
          final dsName = _datasourceNameController.text.trim();
          if (dsId.isEmpty && dsName.isEmpty) { _showError('请输入数据源 ID 或名称'); return; }
          final result = await _cloudBase!.models.getDataSourceAggregateDetail(
            datasourceId: dsId.isNotEmpty ? dsId : null,
            dataSourceName: dsName.isNotEmpty ? dsName : null,
          );
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('RequestId: ${result.requestId}');
          if (result.dataSource != null) {
            final ds = result.dataSource!;
            buf.writeln('--- DataSource Detail ---');
            buf.writeln('  ID: ${ds.id}');
            buf.writeln('  Name: ${ds.name}');
            buf.writeln('  Title: ${ds.title}');
            buf.writeln('  Type: ${ds.type}');
            buf.writeln('  SubType: ${ds.subType}');
            buf.writeln('  DbSourceType: ${ds.dbSourceType}');
            buf.writeln('  Methods: ${ds.methods}');
            buf.writeln('  Description: ${ds.description}');
            if (ds.schema != null) {
              buf.writeln('  Schema: ${ds.schema!.substring(0, ds.schema!.length > 200 ? 200 : ds.schema!.length)}...');
            }
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('getDataSourceAggregateDetail 成功');

        case 'getDataSourceByTableName':
          final tableNames = _datasourceTableNameController.text.trim();
          if (tableNames.isEmpty) { _showError('请输入表名'); return; }
          final names = tableNames.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
          final result = await _cloudBase!.models.getDataSourceByTableName(tableNames: names);
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Count: ${result.dataSourceTableInfos.length}')
            ..writeln('RequestId: ${result.requestId}');
          for (var i = 0; i < result.dataSourceTableInfos.length; i++) {
            final info = result.dataSourceTableInfos[i];
            buf.writeln('--- TableInfo $i ---');
            buf.writeln('  Name: ${info.name}');
            buf.writeln('  TableName: ${info.tableName}');
            buf.writeln('  Title: ${info.title}');
            buf.writeln('  IsDataSource: ${info.isDataSource}');
            buf.writeln('  IsPreview: ${info.isPreview}');
            if (info.schema != null) {
              buf.writeln('  Schema: ${info.schema!.substring(0, info.schema!.length > 200 ? 200 : info.schema!.length)}...');
            }
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('getDataSourceByTableName 成功');

        case 'getBasicDataSourceList':
          final nameListText = _datasourceNameController.text.trim();
          final pageSize = int.tryParse(_modelsPageSizeController.text.trim()) ?? 10;
          final pageNum = int.tryParse(_modelsPageNumberController.text.trim()) ?? 1;
          List<String>? nameList;
          if (nameListText.isNotEmpty) {
            nameList = nameListText.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
          }
          final result = await _cloudBase!.models.getBasicDataSourceList(
            nameList: nameList, pageSize: pageSize, pageNum: pageNum,
          );
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Total: ${result.total}')
            ..writeln('Count: ${result.dataSourceList.length}')
            ..writeln('RequestId: ${result.requestId}');
          for (var i = 0; i < result.dataSourceList.length; i++) {
            final ds = result.dataSourceList[i];
            buf.writeln('--- BasicDataSource $i ---');
            buf.writeln('  ID: ${ds.id}');
            buf.writeln('  Name: ${ds.name}');
            buf.writeln('  Title: ${ds.title}');
            buf.writeln('  Type: ${ds.type}');
            buf.writeln('  SubType: ${ds.subType}');
            buf.writeln('  Methods: ${ds.methods}');
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('getBasicDataSourceList 成功');

        case 'getBasicDataSource':
          final dsId = _datasourceIdController.text.trim();
          final dsName = _datasourceNameController.text.trim();
          if (dsId.isEmpty && dsName.isEmpty) { _showError('请输入数据源 ID 或名称'); return; }
          final result = await _cloudBase!.models.getBasicDataSource(
            datasourceId: dsId.isNotEmpty ? dsId : null,
            dataSourceName: dsName.isNotEmpty ? dsName : null,
          );
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('RequestId: ${result.requestId}');
          if (result.dataSource != null) {
            final ds = result.dataSource!;
            buf.writeln('--- BasicDataSource Detail ---');
            buf.writeln('  ID: ${ds.id}');
            buf.writeln('  Name: ${ds.name}');
            buf.writeln('  Title: ${ds.title}');
            buf.writeln('  Type: ${ds.type}');
            buf.writeln('  SubType: ${ds.subType}');
            buf.writeln('  DbSourceType: ${ds.dbSourceType}');
            buf.writeln('  Methods: ${ds.methods}');
            if (ds.schema != null) {
              buf.writeln('  Schema: ${ds.schema!.substring(0, ds.schema!.length > 200 ? 200 : ds.schema!.length)}...');
            }
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('getBasicDataSource 成功');

        case 'getSchemaList':
          final nameListText = _datasourceNameController.text.trim();
          List<String>? nameList;
          if (nameListText.isNotEmpty) {
            nameList = nameListText.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
          }
          final result = await _cloudBase!.models.getSchemaList(dataSourceNameList: nameList);
          final buf = StringBuffer()
            ..writeln('Success: ${result.isSuccess}')
            ..writeln('Code: ${result.code}')
            ..writeln('Message: ${result.message}')
            ..writeln('Count: ${result.dataSourceRelationInfoList.length}')
            ..writeln('RequestId: ${result.requestId}');
          for (var i = 0; i < result.dataSourceRelationInfoList.length; i++) {
            final rel = result.dataSourceRelationInfoList[i];
            buf.writeln('--- SchemaRelation $i ---');
            buf.writeln('  ID: ${rel.id}');
            buf.writeln('  Name: ${rel.name}');
            buf.writeln('  Title: ${rel.title}');
            buf.writeln('  RelatedFieldKey: ${rel.relatedFieldKey}');
            buf.writeln('  RelatedType: ${rel.relatedType}');
            if (rel.schema != null) {
              buf.writeln('  Schema: ${rel.schema!.substring(0, rel.schema!.length > 200 ? 200 : rel.schema!.length)}...');
            }
          }
          setState(() => _modelsResult = buf.toString());
          if (result.isSuccess) _showSuccess('getSchemaList 成功');

        case 'getTableName':
          final dsName = _datasourceNameController.text.trim();
          final result = await _cloudBase!.models.getTableName(
            dataSourceName: dsName.isNotEmpty ? dsName : null,
          );
          setState(() => _modelsResult =
              'Success: ${result.isSuccess}\nCode: ${result.code}\nMessage: ${result.message}\nTableName: ${result.tableName}\nDbType: ${result.dbType}\nRequestId: ${result.requestId}');
          if (result.isSuccess) _showSuccess('getTableName 成功');
      }
    } catch (e) {
      setState(() => _modelsResult = '异常: $e');
      _showError('数据模型调用异常: $e');
    } finally {
      _setLoading(false);
    }
  }

  // ===========================================================================
  // UI 构建 —— 页面主入口
  // ===========================================================================

  /// 根据当前状态构建不同页面：
  /// 1. 未配置 → 环境配置页面
  /// 2. 已配置 + 未登录 → 登录页面
  /// 3. 已配置 + 已登录 → 用户中心 + 功能测试面板
  @override
  Widget build(BuildContext context) {
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
              : LoginSection(
                  loginType: _loginType,
                  onLoginTypeChanged: (type) {
                    setState(() { _loginType = type; });
                    _resetOtpState();
                  },
                  isLoading: _isLoading,
                  isOtpSent: _isOtpSent,
                  obscurePassword: _obscurePassword,
                  onToggleObscure: () => setState(() => _obscurePassword = !_obscurePassword),
                  errorMessage: _errorMessage,
                  successMessage: _successMessage,
                  usernameController: _usernameController,
                  passwordController: _passwordController,
                  phoneController: _phoneController,
                  emailController: _emailController,
                  otpController: _otpController,
                  onSignInAnonymously: _signInAnonymously,
                  onSignInWithPassword: _signInWithPassword,
                  onSendPhoneOtp: _sendPhoneOtp,
                  onSendEmailOtp: _sendEmailOtp,
                  onVerifyOtp: _verifyOtp,
                  onResetOtp: _resetOtpState,
                ),
    );
  }

  /// 构建环境配置表单页面 —— 输入环境 ID 和 Access Key
  Widget _buildConfigForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 40),
          Icon(
            Icons.cloud_outlined,
            size: 80,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 24),
          Text(
            'CloudBase 环境配置',
            style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            '请填写您的云开发环境信息',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          TextField(
            controller: _envIdController,
            decoration: const InputDecoration(
              labelText: '环境 ID',
              hintText: '请输入云开发环境 ID',
              prefixIcon: Icon(Icons.cloud),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _accessKeyController,
            decoration: const InputDecoration(
              labelText: 'Access Key (可选)',
              hintText: '用于未登录模式下的安全调用',
              prefixIcon: Icon(Icons.key),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _initWithConfig,
              icon: _isLoading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.rocket_launch),
              label: _isLoading ? const Text('初始化中...') : const Text('初始化 CloudBase'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 16),
            _buildMessageCard(_errorMessage!, Colors.red),
          ],
          if (_successMessage != null) ...[
            const SizedBox(height: 16),
            _buildMessageCard(_successMessage!, Colors.green),
          ],
        ],
      ),
    );
  }

  /// 构建已登录后的用户中心页面
  ///
  /// 包含：用户信息卡片 + 各功能测试卡片（云托管、云函数、API、MySQL、数据模型）
  /// + 退出登录按钮
  Widget _buildUserInfo() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          const SizedBox(height: 20),
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
          Text(
            _currentUser?.userMetadata?.nickName ??
                _currentUser?.userMetadata?.username ??
                _currentUser?.userMetadata?.name ??
                '用户',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _currentUser?.isAnonymous == true ? Colors.orange.shade100 : Colors.green.shade100,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              _currentUser?.isAnonymous == true ? '匿名用户' : '正式用户',
              style: TextStyle(
                color: _currentUser?.isAnonymous == true ? Colors.orange.shade800 : Colors.green.shade800,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(height: 24),

          if (_successMessage != null) _buildMessageCard(_successMessage!, Colors.green),
          if (_errorMessage != null) _buildMessageCard(_errorMessage!, Colors.red),

          // 用户详细信息卡片
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('用户信息', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const Divider(),
                  _buildInfoTile(Icons.badge, '用户ID', _currentUser?.id ?? '未知'),
                  if (_currentUser?.email != null) _buildInfoTile(Icons.email, '邮箱', _currentUser!.email!),
                  if (_currentUser?.phone != null) _buildInfoTile(Icons.phone, '手机号', _currentUser!.phone!),
                  if (_currentUser?.userMetadata?.username != null) _buildInfoTile(Icons.person, '用户名', _currentUser!.userMetadata!.username!),
                  if (_currentUser?.createdAt != null) _buildInfoTile(Icons.calendar_today, '创建时间', _formatDateTime(_currentUser!.createdAt!)),
                  if (_currentUser?.lastSignInAt != null) _buildInfoTile(Icons.login, '最后登录', _formatDateTime(_currentUser!.lastSignInAt!)),
                  if (_currentUser?.userMetadata?.hasPassword != null)
                    _buildInfoTile(Icons.lock, '密码状态', _currentUser!.userMetadata!.hasPassword! ? '已设置' : '未设置'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 云托管测试
          CloudRunSection(
            containerNameController: _containerNameController,
            containerPathController: _containerPathController,
            containerDataController: _containerDataController,
            containerMethod: _containerMethod,
            onMethodChanged: (v) => setState(() => _containerMethod = v),
            isLoading: _isLoading,
            result: _cloudRunResult,
            onTest: _testCallContainer,
          ),
          const SizedBox(height: 24),

          // 云函数测试
          CloudFunctionSection(
            functionNameController: _functionNameController,
            functionDataController: _functionDataController,
            isLoading: _isLoading,
            result: _functionResult,
            onTest: _testCallFunction,
          ),
          const SizedBox(height: 24),

          // API 测试
          ApiSection(
            apiNameController: _apiNameController,
            apiPathController: _apiPathController,
            apiDataController: _apiDataController,
            apiMethod: _apiMethod,
            onMethodChanged: (v) => setState(() => _apiMethod = v),
            isLoading: _isLoading,
            result: _apiResult,
            onTest: _testCallApi,
          ),
          const SizedBox(height: 24),

          // MySQL 测试
          MySqlSection(
            mysqlTableController: _mysqlTableController,
            mysqlSchemaController: _mysqlSchemaController,
            mysqlInstanceController: _mysqlInstanceController,
            mysqlSelectController: _mysqlSelectController,
            mysqlFiltersController: _mysqlFiltersController,
            mysqlLimitController: _mysqlLimitController,
            mysqlOffsetController: _mysqlOffsetController,
            mysqlOrderController: _mysqlOrderController,
            mysqlDataController: _mysqlDataController,
            mysqlMethod: _mysqlMethod,
            onMethodChanged: (v) => setState(() => _mysqlMethod = v),
            isLoading: _isLoading,
            result: _mysqlResult,
            onTest: _testMySql,
          ),
          const SizedBox(height: 24),

          // 数据模型测试
          ModelsSection(
            modelsNameController: _modelsNameController,
            modelsRecordIdController: _modelsRecordIdController,
            modelsFilterController: _modelsFilterController,
            modelsSelectController: _modelsSelectController,
            modelsDataController: _modelsDataController,
            modelsPageSizeController: _modelsPageSizeController,
            modelsPageNumberController: _modelsPageNumberController,
            modelsOrderByController: _modelsOrderByController,
            modelsSqlTemplateController: _modelsSqlTemplateController,
            modelsSqlParameterController: _modelsSqlParameterController,
            datasourceIdController: _datasourceIdController,
            datasourceNameController: _datasourceNameController,
            datasourceTableNameController: _datasourceTableNameController,
            modelsMethod: _modelsMethod,
            onMethodChanged: (v) => setState(() => _modelsMethod = v),
            isLoading: _isLoading,
            result: _modelsResult,
            onTest: _testModels,
          ),
          const SizedBox(height: 24),

          // 退出登录按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _signOut,
              icon: const Icon(Icons.logout),
              label: _isLoading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
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

  // ===========================================================================
  // 通用 UI 小组件
  // ===========================================================================

  /// 构建用户信息行 —— 图标 + 标签 + 值
  Widget _buildInfoTile(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          Text('$label: ', style: const TextStyle(color: Colors.grey)),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }

  /// 构建提示消息卡片（红色=错误，绿色=成功）
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
          Expanded(child: Text(message, style: TextStyle(color: color.shade700))),
        ],
      ),
    );
  }

  /// 格式化日期时间字符串为 "YYYY-MM-DD HH:mm" 格式
  String _formatDateTime(String dateTimeStr) {
    try {
      final dt = DateTime.parse(dateTimeStr);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateTimeStr;
    }
  }
}
