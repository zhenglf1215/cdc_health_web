import subprocess
import json
import re

# 获取所有 user_environment_stats 数据
result = subprocess.run(['psql', '-d', subprocess.os.environ.get('DATABASE_URL', '').replace('postgres://', 'postgresql://')], 
                       input='''
SELECT id, hr_av, hr_ad, hr_sd, hr_cv, hr_skew, hr_count, hr_min, hr_max,
       tre_av, tre_ad, tre_sd, tre_cv, tre_skew, tre_count,
       tsk_av, tsk_ad, tsk_sd, tsk_cv, tsk_skew, tsk_count
FROM user_environment_stats;
''', capture_output=True, text=True)

print(result.stdout)
