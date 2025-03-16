#pragma once

#include <memory>
#include <iostream>

// Type 类的单例基类
template<class Type>
class Singleton
    : public std::enable_shared_from_this<Type>
{
public:
    static std::shared_ptr<Type> GetInstance()
    {
        // static 保证是多线程安全的
        static std::shared_ptr<Type> instance( new Type );
        return instance;
    }

public:
    Singleton( const Singleton<Type>& ) = delete;
    Singleton<Type>& operator=( const Singleton<Type>& ) = delete;

    ~Singleton() = default;

protected:
    Singleton() = default;
};
