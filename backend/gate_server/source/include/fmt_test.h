#include <fmt/core.h>
#include <string>

class FmtTester
{
public:
    std::string Print()
    {
        int a = 2;
        return fmt::format( "a is {}", a );
    }
};