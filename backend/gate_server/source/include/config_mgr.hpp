#pragma once

#include "singleton.hpp"

#include <json/json.hpp>
#include <unordered_map>

// 模仿 ini 文件，section 代表一个配置块
class SubSection
{
public:
    SubSection() = default;
    SubSection( const SubSection& rhs );
    SubSection& operator=( const SubSection& rhs );

    SubSection( SubSection&& rhs );

    ~SubSection() { datas.clear(); }

public:
    void SetName( const std::string& name ) { this->name = name; }

    void AddData( const std::string& key, const std::string& value ) { datas[ key ] = value; }

    // 返回配置块中 key 对应的 value
    std::string operator[]( const std::string& key ) { return datas[ key ]; }

private:
    std::string name;
    std::unordered_map<std::string, std::string> datas;
};

// 单例类
// 用于管理配置文件
class ConfigMgr
    : public Singleton<ConfigMgr>
{
    friend class Singleton<ConfigMgr>;

public:
    ~ConfigMgr();

    // 返回 sections 中指定的配置块
    SubSection operator[]( const std::string& section_name );

private:
    ConfigMgr();

private:
    static const std::string CONFIG_FILE; // 使用相对路径标定的配置文件

    std::unordered_map<std::string, SubSection> sections; // 配置块 map
};