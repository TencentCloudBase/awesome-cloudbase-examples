const cloud = require('wx-server-sdk');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 动态设置FFmpeg路径 - 支持多种环境
function setupFFmpegPath() {
  try {
    // 尝试方式1: 使用ffmpeg-static
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      console.log('使用ffmpeg-static路径:', ffmpegStatic);
      ffmpeg.setFfmpegPath(ffmpegStatic);
      return ffmpegStatic;
    }
  } catch (error) {
    console.log('ffmpeg-static加载失败:', error.message);
  }
  
  try {
    // 尝试方式2: 使用@ffmpeg-installer/ffmpeg
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
      console.log('使用@ffmpeg-installer/ffmpeg路径:', ffmpegInstaller.path);
      ffmpeg.setFfmpegPath(ffmpegInstaller.path);
      return ffmpegInstaller.path;
    }
  } catch (error) {
    console.log('@ffmpeg-installer/ffmpeg加载失败:', error.message);
  }
  
  // 尝试方式3: 查找系统FFmpeg
  const possiblePaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/bin/ffmpeg',
    '/bin/ffmpeg'
  ];
  
  for (const ffmpegPath of possiblePaths) {
    if (fs.existsSync(ffmpegPath)) {
      console.log('找到系统FFmpeg:', ffmpegPath);
      ffmpeg.setFfmpegPath(ffmpegPath);
      return ffmpegPath;
    }
  }
  
  // 尝试方式4: 使用相对路径查找
  try {
    const relativePath = path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg');
    if (fs.existsSync(relativePath)) {
      console.log('使用相对路径FFmpeg:', relativePath);
      ffmpeg.setFfmpegPath(relativePath);
      return relativePath;
    }
  } catch (error) {
    console.log('相对路径查找失败:', error.message);
  }
  
  throw new Error('无法找到FFmpeg可执行文件');
}

// 使用FFmpeg提取视频第2秒帧作为封面
exports.main = async (event, context) => {
  const { videoFileID } = event;
  
  try {
    console.log('开始提取视频第2秒帧，视频ID:', videoFileID);
    
    if (!videoFileID) {
      return {
        success: false,
        error: '缺少视频文件ID'
      };
    }
    
    // 设置FFmpeg路径
    let ffmpegPath;
    try {
      ffmpegPath = setupFFmpegPath();
      console.log('FFmpeg设置成功，路径:', ffmpegPath);
    } catch (pathError) {
      console.error('FFmpeg路径设置失败:', pathError.message);
      return {
        success: true,
        data: {
          posterUrl: getDefaultPoster(),
          message: 'FFmpeg不可用，使用默认封面: ' + pathError.message
        }
      };
    }
    
    // 创建临时文件路径
    const videoTempPath = `/tmp/video_${Date.now()}.mp4`;
    const frameTempPath = `/tmp/frame_${Date.now()}.png`;
    
    try {
      // 1. 从云存储下载视频文件
      console.log('正在下载视频文件...');
      const videoResult = await cloud.downloadFile({
        fileID: videoFileID
      });
      
      // 将视频文件写入临时目录
      fs.writeFileSync(videoTempPath, videoResult.fileContent);
      console.log('视频文件下载成功，大小:', videoResult.fileContent.length, 'bytes');
      
      // 2. 使用fluent-ffmpeg提取第2秒的帧
      console.log('正在使用fluent-ffmpeg提取第2秒帧...');
      await extractVideoFrameWithFluentFFmpeg(videoTempPath, frameTempPath, 1);
      
      // 3. 检查提取的帧文件
      if (!fs.existsSync(frameTempPath)) {
        throw new Error('FFmpeg提取帧失败，文件不存在');
      }
      
      const frameStats = fs.statSync(frameTempPath);
      if (frameStats.size === 0) {
        throw new Error('提取的帧文件为空');
      }
      
      console.log('帧提取成功，文件大小:', frameStats.size, 'bytes');
      
      // 4. 上传封面到云存储
      console.log('正在上传封面到云存储...');
      const posterFileID = await uploadFrameToCloud(frameTempPath);
      
      // 5. 清理临时文件
      cleanupTempFiles([videoTempPath, frameTempPath]);
      
      return {
        success: true,
        data: {
          posterUrl: posterFileID,
          message: '视频第2秒帧提取成功'
        }
      };
      
    } catch (processError) {
      console.error('处理视频失败:', processError);
      
      // 清理临时文件
      cleanupTempFiles([videoTempPath, frameTempPath]);
      
      // 如果提取失败，返回默认封面
      return {
        success: true,
        data: {
          posterUrl: getDefaultPoster(),
          message: '视频帧提取失败，使用默认封面: ' + processError.message
        }
      };
    }
    
  } catch (error) {
    console.error('提取视频帧失败:', error);
    return {
      success: false,
      error: error.message || '提取视频帧失败'
    };
  }
};

// 使用fluent-ffmpeg提取指定秒数的视频帧
function extractVideoFrameWithFluentFFmpeg(videoPath, outputPath, second) {
  return new Promise((resolve, reject) => {
    console.log(`开始fluent-ffmpeg处理，提取第${second}秒帧...`);
    
    // 添加超时保护
    const timeout = setTimeout(() => {
      reject(new Error('FFmpeg处理超时(30秒)'));
    }, 30000);
    
    ffmpeg(videoPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg命令启动:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log('处理进度:', Math.round(progress.percent) + '%');
        }
      })
      .on('end', () => {
        console.log('FFmpeg处理完成');
        clearTimeout(timeout);
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg错误:', err.message);
        if (stdout) console.log('FFmpeg stdout:', stdout);
        if (stderr) console.log('FFmpeg stderr:', stderr);
        clearTimeout(timeout);
        reject(new Error(`FFmpeg处理失败: ${err.message}`));
      })
      .seekInput(second)           // 定位到第N秒
      .frames(1)                   // 只提取1帧
      .size('400x533')             // 设置输出尺寸 (9:16比例)
      .outputOptions([
        '-vf scale=400:533',       // 视频滤镜缩放
        '-f image2',               // 强制图像格式
        '-vcodec png'              // 使用PNG编码器
      ])
      .save(outputPath);
  });
}

// 上传帧到云存储
async function uploadFrameToCloud(framePath) {
  try {
    const fileName = `posters/frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    
    const result = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: fs.createReadStream(framePath)
    });
    
    console.log('帧上传成功:', result.fileID);
    return result.fileID;
    
  } catch (error) {
    console.error('帧上传失败:', error);
    throw error;
  }
}

// 获取默认封面
function getDefaultPoster() {
  const defaultPosters = [
    'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&h=533&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478720568477-b956dc04a9f1?w=400&h=533&fit=crop&q=80',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=533&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=533&fit=crop&q=80'
  ];
  
  const randomIndex = Math.floor(Math.random() * defaultPosters.length);
  return defaultPosters[randomIndex];
}

// 清理临时文件
function cleanupTempFiles(filePaths) {
  filePaths.forEach(filePath => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('临时文件已删除:', filePath);
      } catch (error) {
        console.error('删除临时文件失败:', filePath, error.message);
      }
    }
  });
} 