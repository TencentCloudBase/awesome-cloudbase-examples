import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {getApp} from '../config/cloudbase';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

interface TestScreenProps {
  onBack?: () => void;
}

const TestScreen: React.FC<TestScreenProps> = ({onBack}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  
  // 云函数测试参数
  const [functionName, setFunctionName] = useState('test');
  const [functionParams, setFunctionParams] = useState('{"name": "test"}');

  // 添加测试结果
  const addResult = (key: string, result: TestResult) => {
    setResults(prev => ({...prev, [key]: result}));
  };

  // ============ 云函数测试 ============
  const testCallFunction = async () => {
    setLoading('callFunction');
    try {
      const app = getApp();
      let params = {};
      try {
        params = JSON.parse(functionParams);
      } catch {
        params = {};
      }

      const res = await app.callFunction({
        name: functionName,
        data: params,
      });

      addResult('callFunction', {
        success: true,
        message: `云函数 ${functionName} 调用成功`,
        data: res,
      });
    } catch (error: any) {
      addResult('callFunction', {
        success: false,
        message: '云函数调用失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  // ============ 云存储测试 ============
  const [fileId, setFileId] = useState('cloud://lowcode-1gk9y5ik310a94df.6c6f-lowcode-1gk9y5ik310a94df-1307578329/adamsyu/cloudbase.full.js');
  const [selectedFile, setSelectedFile] = useState<{name: string; uri: string; mimeType: string} | null>(null);

  // 选择本地文件
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (error: any) {
      addResult('storageUpload', {
        success: false,
        message: '选择文件失败',
        error: error?.message || error,
      });
    }
  };

  const testStorageUpload = async () => {
    setLoading('storageUpload');
    try {
      const app = getApp();
      const storage = (app as any).storage.from();
      
      let base64Content: string;
      let fileName: string;
      let contentType: string;

      if (selectedFile) {
        // 读取选中的文件为 base64
        const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64Content = fileContent;
        fileName = selectedFile.name;
        contentType = selectedFile.mimeType;
      } else {
        // 默认上传测试文本
        const testContent = `Test file created at ${new Date().toISOString()}`;
        base64Content = btoa(unescape(encodeURIComponent(testContent)));
        fileName = `rn-test-${Date.now()}.txt`;
        contentType = 'text/plain';
      }
      
      const {data, error} = await storage.upload(
        `adamsyu/${fileName}`,
        base64Content,
        {
          contentType,
          contentEncoding: 'base64',
        }
      );

      if (error) {
        throw error;
      }

      // 保存文件 ID 供后续测试使用
      if (data?.id) {
        setFileId(data.id);
      }

      // 清除已选文件
      setSelectedFile(null);

      addResult('storageUpload', {
        success: true,
        message: `文件上传成功，ID: ${data?.id}`,
        data,
      });
    } catch (error: any) {
      addResult('storageUpload', {
        success: false,
        message: '文件上传失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  const testStorageCreateSignedUrl = async () => {
    setLoading('storageSignedUrl');
    try {
      if (!fileId) {
        throw new Error('请先上传文件或输入文件 ID');
      }

      const app = getApp();
      const storage = (app as any).storage.from();

      // 创建签名 URL
      const {data, error} = await storage.createSignedUrl(
        fileId,
        3600 // 1小时有效期
      );

      if (error) {
        throw error;
      }

      addResult('storageSignedUrl', {
        success: true,
        message: '签名URL创建成功',
        data: {
          fileId,
          signedUrl: data?.signedUrl,
        },
      });
    } catch (error: any) {
      addResult('storageSignedUrl', {
        success: false,
        message: '签名URL创建失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  const testStorageInfo = async () => {
    setLoading('storageInfo');
    try {
      if (!fileId) {
        throw new Error('请先上传文件或输入文件 ID');
      }

      const app = getApp();
      const storage = (app as any).storage.from();

      // 获取文件信息
      const {data, error} = await storage.info(fileId);

      if (error) {
        throw error;
      }

      addResult('storageInfo', {
        success: true,
        message: `文件名: ${data?.name}，大小: ${data?.size} bytes`,
        data,
      });
    } catch (error: any) {
      addResult('storageInfo', {
        success: false,
        message: '获取文件信息失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  // ============ 数据模型测试 ============
  const [modelName, setModelName] = useState('julian');
  const [modelId, setModelId] = useState('5d05e13569200cda0007c0a42540a558');

  const testModelList = async () => {
    setLoading('modelList');
    try {
      const app = getApp();
      const models = app.models as any;
      
      // 查询数据模型
      const result = await models[modelName].list({
        select: {
          $master: true,
        },
        filter: {
          limit: 10,
        },
      });

      addResult('modelList', {
        success: true,
        message: `查询到 ${result.data?.records?.length || 0} 条记录`,
        data: result,
      });
    } catch (error: any) {
      addResult('modelList', {
        success: false,
        message: '数据模型查询失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  const testModelGet = async () => {
    setLoading('modelGet');
    try {
      if (!modelId) {
        throw new Error('请输入要查询的记录 ID');
      }
      
      const app = getApp();
      const models = app.models as any;
      
      // 根据 ID 获取单条记录
      const result = await models[modelName].get({
        filter: {
          where: {
            _id: {
              $eq: modelId,
            },
          },
        },
        select: {
          $master: true,
        },
      });

      addResult('modelGet', {
        success: true,
        message: result.data ? '查询成功' : '未找到记录',
        data: result,
      });
    } catch (error: any) {
      addResult('modelGet', {
        success: false,
        message: '数据模型查询失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  const testModelCreate = async () => {
    setLoading('modelCreate');
    try {
      const app = getApp();
      const models = app.models as any;
      
      // 创建一条测试数据
      const result = await models[modelName].create({
        data: {
          title: `RN测试 ${new Date().toLocaleTimeString()}`,
        },
      });

      addResult('modelCreate', {
        success: true,
        message: '数据创建成功',
        data: result,
      });
    } catch (error: any) {
      addResult('modelCreate', {
        success: false,
        message: '数据创建失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  // ============ SQL 数据库测试 ============
  const testSqlSelect = async () => {
    setLoading('sqlSelect');
    try {
      const app = getApp();
      const db = app.rdb();
      
      // 查询数据
      const {data, error} = await db
        .from('shop_sku')
        .select('*')
        .limit(10);

      if (error) {
        throw error;
      }

      addResult('sqlSelect', {
        success: true,
        message: `SQL查询成功，共 ${data?.length || 0} 条记录`,
        data,
      });
    } catch (error: any) {
      addResult('sqlSelect', {
        success: false,
        message: 'SQL查询失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  const testSqlInsert = async () => {
    setLoading('sqlInsert');
    try {
      const app = getApp();
      const db = app.rdb();
      
      // 插入数据
      const {data, error} = await db
        .from('shop_sku')
        .insert({
          image: `RN测试 ${Date.now()}`,
          _id: +Date.now()
        });

      if (error) {
        throw error;
      }

      addResult('sqlInsert', {
        success: true,
        message: 'SQL插入成功',
        data,
      });
    } catch (error: any) {
      addResult('sqlInsert', {
        success: false,
        message: 'SQL插入失败',
        error: error?.message || error,
      });
    } finally {
      setLoading(null);
    }
  };

  // 渲染测试按钮
  const renderTestButton = (
    title: string,
    key: string,
    onPress: () => void,
    color: string = '#1890ff'
  ) => (
    <TouchableOpacity
      style={[styles.testButton, {backgroundColor: color}]}
      onPress={onPress}
      disabled={loading !== null}>
      {loading === key ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.testButtonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );

  // 渲染测试结果
  const renderResult = (key: string) => {
    const result = results[key];
    if (!result) return null;

    return (
      <View
        style={[
          styles.resultBox,
          {borderColor: result.success ? '#52c41a' : '#ff4d4f'},
        ]}>
        <Text
          style={[
            styles.resultStatus,
            {color: result.success ? '#52c41a' : '#ff4d4f'},
          ]}>
          {result.success ? '✓ 成功' : '✗ 失败'}
        </Text>
        <Text style={styles.resultMessage}>{result.message}</Text>
        {result.data && (
          <Text style={styles.resultData} numberOfLines={5}>
            {JSON.stringify(result.data, null, 2)}
          </Text>
        )}
        {result.error && (
          <Text style={styles.resultError}>
            Error: {typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}>
          <Text style={styles.title}>CloudBase SDK 测试</Text>
          <Text style={styles.subtitle}>React Native 适配器功能测试</Text>

          {/* 返回按钮 */}
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← 返回首页</Text>
            </TouchableOpacity>
          )}

        {/* 云函数测试 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>云函数 (callFunction)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>函数名:</Text>
            <TextInput
              style={styles.input}
              value={functionName}
              onChangeText={setFunctionName}
              placeholder="输入云函数名称"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>参数:</Text>
            <TextInput
              style={styles.input}
              value={functionParams}
              onChangeText={setFunctionParams}
              placeholder='{"key": "value"}'
            />
          </View>
          {renderTestButton('调用云函数', 'callFunction', testCallFunction)}
          {renderResult('callFunction')}
        </View>

        {/* 云存储测试 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>云存储 (Storage)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>文件ID:</Text>
            <TextInput
              style={styles.input}
              value={fileId}
              onChangeText={setFileId}
              placeholder="上传后自动填充，或手动输入"
            />
          </View>
          {/* 文件选择区域 */}
          <TouchableOpacity style={styles.filePickerButton} onPress={pickFile}>
            <Text style={styles.filePickerText}>
              {selectedFile ? `📎 ${selectedFile.name}` : '📁 点击选择本地文件'}
            </Text>
          </TouchableOpacity>
          {selectedFile && (
            <TouchableOpacity 
              style={styles.clearFileButton} 
              onPress={() => setSelectedFile(null)}>
              <Text style={styles.clearFileText}>✕ 清除选择</Text>
            </TouchableOpacity>
          )}
          <View style={styles.buttonRow}>
            {renderTestButton(
              selectedFile ? '上传选中文件' : '上传测试文件', 
              'storageUpload', 
              testStorageUpload, 
              '#13c2c2'
            )}
            {renderTestButton('创建签名URL', 'storageSignedUrl', testStorageCreateSignedUrl, '#13c2c2')}
          </View>
          <View style={styles.buttonRow}>
            {renderTestButton('获取文件信息', 'storageInfo', testStorageInfo, '#13c2c2')}
          </View>
          {renderResult('storageUpload')}
          {renderResult('storageSignedUrl')}
          {renderResult('storageInfo')}
        </View>

        {/* 数据模型测试 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据模型 (Model)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>模型名:</Text>
            <TextInput
              style={styles.input}
              value={modelName}
              onChangeText={setModelName}
              placeholder="输入模型名称"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>记录ID:</Text>
            <TextInput
              style={styles.input}
              value={modelId}
              onChangeText={setModelId}
              placeholder="输入记录 _id（用于 get 查询）"
            />
          </View>
          <View style={styles.buttonRow}>
            {renderTestButton('查询列表', 'modelList', testModelList, '#722ed1')}
            {renderTestButton('查询单条', 'modelGet', testModelGet, '#722ed1')}
          </View>
          <View style={styles.buttonRow}>
            {renderTestButton('创建数据', 'modelCreate', testModelCreate, '#722ed1')}
          </View>
          {renderResult('modelList')}
          {renderResult('modelGet')}
          {renderResult('modelCreate')}
        </View>

        {/* SQL 数据库测试 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SQL 数据库 (RDB)</Text>
          <View style={styles.buttonRow}>
            {renderTestButton('查询数据', 'sqlSelect', testSqlSelect, '#eb2f96')}
            {renderTestButton('插入数据', 'sqlInsert', testSqlInsert, '#eb2f96')}
          </View>
          {renderResult('sqlSelect')}
          {renderResult('sqlInsert')}
        </View>

        {/* 清除结果 */}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setResults({})}>
          <Text style={styles.clearButtonText}>清除所有结果</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>环境: lowcode-1gk9y5ik310a94df</Text>
          <Text style={styles.footerText}>SDK: @cloudbase/js-sdk v3</Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  backButtonText: {
    color: '#1890ff',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    width: 60,
    fontSize: 14,
    color: '#666',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  filePickerButton: {
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#adc6ff',
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  filePickerText: {
    color: '#1890ff',
    fontSize: 14,
  },
  clearFileButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  clearFileText: {
    color: '#999',
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  testButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resultBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fafafa',
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  resultData: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  resultError: {
    fontSize: 12,
    color: '#ff4d4f',
    marginTop: 4,
  },
  clearButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
});

export default TestScreen;
