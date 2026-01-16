import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {initCloudbase, getSavedConfig} from '../config/cloudbase';

interface ConfigScreenProps {
  onConfigured?: () => void;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({onConfigured}) => {
  const savedConfig = getSavedConfig();
  const [env, setEnv] = useState(savedConfig?.env || '');
  const [accessKey, setAccessKey] = useState(savedConfig?.accessKey || '');
  const [region, setRegion] = useState(savedConfig?.region || 'ap-shanghai');
  const [saved, setSaved] = useState(false);

  const handleSubmit = () => {
    if (!env.trim()) {
      Alert.alert('提示', '请输入环境 ID');
      return;
    }

    try {
      // 保存配置并初始化
      initCloudbase({
        env: env.trim(),
        accessKey: accessKey.trim() || '',
        region: region.trim() || 'ap-shanghai',
      });
      setSaved(true);
      
      if (onConfigured) {
        onConfigured();
      }
    } catch (error: any) {
      Alert.alert('初始化失败', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>CloudBase 配置</Text>
            <Text style={styles.subtitle}>请输入云开发环境信息</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>环境 ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="例如: lowcode-1gk9y5ik310a94df"
                value={env}
                onChangeText={setEnv}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>在云开发控制台获取环境 ID</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Access Key（可选）</Text>
              <TextInput
                style={[styles.input, styles.accessKeyInput]}
                placeholder="粘贴你的 Access Key"
                value={accessKey}
                onChangeText={setAccessKey}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <Text style={styles.hint}>在云开发控制台 - 环境设置 - 安全配置中创建</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>地域</Text>
              <TextInput
                style={styles.input}
                placeholder="ap-shanghai"
                value={region}
                onChangeText={setRegion}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>默认为 ap-shanghai（上海）</Text>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, saved && styles.submitButtonSaved]} 
              onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {saved ? '已初始化' : '初始化'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tipText}>
            配置保存后立即生效
          </Text>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  accessKeyInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonSaved: {
    backgroundColor: '#52c41a',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 24,
  },
});

export default ConfigScreen;
