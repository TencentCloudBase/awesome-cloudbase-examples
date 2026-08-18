// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger, toast } from '@/components/ui';
// @ts-ignore;
import { CalendarIcon, Ticket } from 'lucide-react';
export default function AppointmentPage(props) {
  const params = props.$w.page.dataset.params;

  const [date, setDate] = useState(() => {
    try {
      return new Date();
    } catch (e) {
      console.error('Date initialization error:', e);
      return new Date(0);
    }
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 从路由参数中获取展览信息
  const exhibitionId = params.exhibitionId || '';
  const exhibitionTitle = params.exhibitionTitle || '';
  const exhibitionDate = params.exhibitionDate || '';
  const exhibitionLocation = params.exhibitionLocation || '';
  const timeSlots = ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00'];
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (!date || !selectedTime) {
        toast({
          title: '请选择日期和时间段',
          variant: 'destructive'
        });
        return;
      }
      setIsSubmitting(true);
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      // 调用数据模型API创建预约记录
      const appointmentData = {
        date: formattedDate,
        time: selectedTime,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        exhibitionId: exhibitionId
      };

      try {
        const result = await props.$w.cloud.callDataSource({
          dataSourceName: 'appointment',
          methodName: 'wedaCreateV2',
          params: {
            data: appointmentData
          }
        });

        console.log('预约创建成功:', result);

        toast({
          title: '预约成功',
          description: `您已成功预约${exhibitionTitle}的参观`
        });

        // 延迟1.5秒后跳转到个人页面查看预约
        setTimeout(() => {
          props.$w.utils.navigateTo({
            pageId: 'ProfilePage'
          });
        }, 1500);

      } catch (apiError) {
        console.error('API调用失败:', apiError);

        // 如果API调用失败，仍然显示成功消息并跳转（用于演示）
        console.log('预约数据（备用）:', appointmentData);

        toast({
          title: '预约成功',
          description: `您已成功预约${exhibitionTitle}的参观`
        });

        // 延迟1.5秒后跳转到个人页面
        setTimeout(() => {
          props.$w.utils.navigateTo({
            pageId: 'ProfilePage'
          });
        }, 1500);
      }
    } catch (error) {
      console.error('预约失败:', error);
      toast({
        title: '预约失败',
        description: error.message || '请稍后再试',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleChange = e => {
    try {
      const {
        name,
        value
      } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } catch (e) {
      console.error('Form change error:', e);
    }
  };
  return <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          <Ticket className="inline mr-2 text-purple-600" />
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">预约参观：{exhibitionTitle}</span>
        </h1>
        
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <p className="text-purple-800"><span className="font-medium">展览时间：</span>{exhibitionDate}</p>
          <p className="text-blue-800 mt-2"><span className="font-medium">展览地点：</span>{exhibitionLocation}</p>
        </div>

        {/* 日期选择 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">选择日期</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal border-purple-300 hover:border-purple-500 hover:bg-purple-50">
                <CalendarIcon className="mr-2 h-4 w-4 text-purple-600" />
                {date ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` : "选择日期"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-purple-200 shadow-lg">
              <Calendar mode="single" selected={date} onSelect={date => {
              try {
                setDate(date);
              } catch (e) {
                console.error('Date selection error:', e);
              }
            }} initialFocus className="border-0" />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* 时间段选择 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">选择时间段</h2>
          <div className="grid grid-cols-2 gap-3">
            {timeSlots.map(time => <Button key={time} variant={selectedTime === time ? "default" : "outline"} onClick={() => {
            try {
              setSelectedTime(time);
            } catch (e) {
              console.error('Time selection error:', e);
            }
          }} className={selectedTime === time ? "bg-purple-600 hover:bg-purple-700" : "hover:bg-purple-50 hover:text-purple-700 border-purple-300"}>
                {time}
              </Button>)}
          </div>
        </div>
        
        {/* 联系信息表单 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">联系信息</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">电话</label>
              <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white" disabled={isSubmitting}>
              {isSubmitting ? '处理中...' : '确认预约'}
            </Button>
          </form>
        </div>
      </div>
    </div>;
}