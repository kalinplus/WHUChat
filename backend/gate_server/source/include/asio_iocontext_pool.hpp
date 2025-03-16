#pragma once

#include "singleton.hpp"

#include <boost/asio.hpp>

#include <vector>
#include <thread>

// RAII 类
// asio 的 io_context 线程池，每个线程保管一个io_context
class AsioIoContextPool
    : public Singleton<AsioIoContextPool>
{
    friend class Singleton<AsioIoContextPool>;

public:
    using IoService = boost::asio::io_context;
    using Work = boost::asio::executor_work_guard<boost::asio::io_context::executor_type>;
    using WorkPtr = std::unique_ptr<Work>;

public:
    ~AsioIoContextPool();
    AsioIoContextPool( const AsioIoContextPool& ) = delete;
    AsioIoContextPool& operator=( const AsioIoContextPool& ) = delete;

    // 以 round-robin （轮询）方式选择并返回一个 io_context
    IoService& GetIoService();

private:
    // size 可以传入 std::thread::hardware_concurrency()，表示使用所有 CPU 核心
    AsioIoContextPool( std::size_t size = 3 );

    // RAII，资源只由自己创建和清除
    void Tidy();

private:
    std::vector<IoService> io_services;
    std::vector<WorkPtr> works;
    std::vector<std::thread> working_threads;
    std::size_t next_io_service; // 在轮询中记录下一个 io_context 的索引
};