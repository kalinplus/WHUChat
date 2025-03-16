#include "config_mgr.hpp"
#include "logic_mgr.hpp"
#include "asio_iocontext_pool.hpp"

#include <iostream>
#include <filesystem>

int main( int argc, char* argv[] )
{
    // 获取配置管理器
    auto config_mgr = ConfigMgr::GetInstance();

    return 0;
}