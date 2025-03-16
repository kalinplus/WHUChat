#include "asio_iocontext_pool.hpp"

#include <iostream>

AsioIoContextPool::~AsioIoContextPool()
{
    Tidy();

    std::cout << "asio io_context pool deconstructed" << std::endl;
}

AsioIoContextPool::IoService& AsioIoContextPool::GetIoService()
{
    IoService& service = io_services[ next_io_service ];
    next_io_service++;
    if ( next_io_service == io_services.size() )
        next_io_service = 0;

    return service;
}

void AsioIoContextPool::Tidy()
{
    // 由于直接调用 work 的 reset() 函数并不会隐式调用 io_context 的 stop() 函数
    // 需要手动地显式调用 io_context 的 stop() 函数 
    //（只有已经注册了写/读事件的 io_context 需要因为他们的监听任务不会结束）
    for ( auto& work : works )
    {
        IoService& service = work->get_executor().context();
        if ( !service.stopped() )
            service.stop(); // 使 io_context 的 run() 函数结束阻塞

        work.reset(); // 解绑定
    }

    // 在 thread 中运行的 io_context 结束 run() 后回调函数就已经结束运行可以join
    // （也是为了防止 working_threads 析构时有的线程没有停止运行
    for ( std::size_t i = 0; i < working_threads.size(); i++ )
        working_threads[ i ].join();
}

AsioIoContextPool::AsioIoContextPool( std::size_t size )
    : io_services( size ), works( size )
    , next_io_service( 0 )
    /* 此处不初始化 working_threads 的大小，而在下文 emplace_back */
{
    // 将 io_context 绑定到对应的 executor_work_guard
    // executor_work_guard 可以保证 io_context 没有事件注册时不会跳出 run()
    for ( std::size_t i = 0; i < size; i++ )
    {
        Work work = boost::asio::make_work_guard( io_services[ i ] );
        works[ i ] = std::make_unique<Work>( std::move( work ) );
    }

    // 遍历每个 io_service，将其分配到一个线程中开始运行
    for ( std::size_t i = 0; i < io_services.size(); i++ )
    {
        working_threads.emplace_back(
            [ this, i ] ()
        {
            this->io_services[ i ].run();
        } );
    }
}