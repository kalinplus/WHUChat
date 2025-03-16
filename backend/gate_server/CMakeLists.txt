cmake_minimum_required( VERSION 3.10 )

# 打印当前运行 CMake 源文件的目录
message( STATUS "CMake curr dir: " ${CMAKE_CURRENT_SOURCE_DIR} )

# 项目名称宏定义
set( PROJ_NAME "gate_server" )

# 设置项目基础属性
project( ${PROJ_NAME}
    LANGUAGES C CXX
    VERSION 0.1.0
)

# 设置 C++ 标准，并限制编译器扩展
set( CMAKE_CXX_STANDARD 17 )
set( CMAKE_CXX_STANDARD_REQUIRED ON )
set( CMAKE_CXX_EXTENSIONS OFF )

# 设置源码集合
file( GLOB SOURCE_CODE "source/*.cpp" )
# 打印源码文件宏
message( STATUS "Source code: " ${SOURCE_CODE} )

# 第三方库包含
find_package( 
    fmt REQUIRED # fmt 字符串格式化库
)

# 创建目标
add_executable( ${PROJ_NAME}
    ${SOURCE_CODE}
)

# 设定 include 目录
target_include_directories( ${PROJ_NAME}
    PRIVATE 
        "./source/include/" # 自己编写的头文件
        "/home/lubover/code_resources/thirdparty/" # 下载的第三方源码
)

# 设定所需链接第三方库
target_link_libraries( ${PROJ_NAME}
    PRIVATE 
        fmt::fmt # fmt 字符串格式化库
        mysqlcppconn # MySQL C++ 连接库
)

# 添加不同编译模式下的宏定义
if(CMAKE_BUILD_TYPE STREQUAL "Debug")  
    add_definitions(-DDEBUG) # DEBUG 宏
endif()  